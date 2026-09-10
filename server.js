import express from 'express';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = process.env.PORT || 10000;
const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';
const FORECAST_WINDOW_MS = 60_000;
const FORECAST_MAX_REQUESTS = 12;
const MAX_FORECAST_RECORDS = 2_000;
const MAX_RECORD_STRING = 200;

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb', strict: true }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use(express.static(__dirname, { extensions: ['html'] }));

const readJson = f => JSON.parse(readFileSync(join(__dirname, 'data', f), 'utf8'));
const cache = (res, s = 300) => res.setHeader('Cache-Control', `public,max-age=${s},stale-while-revalidate=1800`);

const rateBuckets = new Map();
function forecastRateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  let bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.startedAt >= FORECAST_WINDOW_MS) {
    bucket = { startedAt: now, count: 0 };
    rateBuckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > FORECAST_MAX_REQUESTS) {
    const retryAfter = Math.max(1, Math.ceil((FORECAST_WINDOW_MS - (now - bucket.startedAt)) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({ ok: false, error: 'Too many forecast requests. Please try again shortly.' });
  }
  return next();
}
setInterval(() => {
  const cutoff = Date.now() - FORECAST_WINDOW_MS;
  for (const [key, bucket] of rateBuckets) {
    if (bucket.startedAt < cutoff) rateBuckets.delete(key);
  }
}, FORECAST_WINDOW_MS).unref();

const REQUIRED_STRING_FIELDS = ['date', 'fiber', 'product', 'yarn_type', 'count', 'blend', 'state', 'district', 'centre', 'spinning'];
function validateForecastPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Invalid request body.';
  if (!Array.isArray(body.records) || body.records.length === 0) return 'Forecast records are required.';
  if (body.records.length > MAX_FORECAST_RECORDS) return `Too many records. Maximum is ${MAX_FORECAST_RECORDS}.`;
  const horizon = Number(body.horizon);
  if (!Number.isInteger(horizon) || horizon < 1 || horizon > 12) return 'Horizon must be an integer from 1 to 12.';

  for (const row of body.records) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return 'Invalid forecast record.';
    const date = String(row.date ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Invalid record date.';
    const price = Number(row.price_inr_kg);
    if (!Number.isFinite(price) || price <= 0 || price > 1_000_000) return 'Invalid yarn price.';
    for (const field of REQUIRED_STRING_FIELDS) {
      if (field === 'date') continue;
      const value = row[field];
      if (value !== undefined && value !== null && String(value).length > MAX_RECORD_STRING) return 'Forecast record field is too long.';
    }
  }
  return null;
}

app.get('/api/yarn', (req, res) => {
  try {
    const d = readJson('yarn.json'), r = d.records || [];
    cache(res); res.json({ records: r, count: r.length, coverage: d.coverage || {}, source: d.source || 'official-textile-sources' });
  } catch { res.status(500).json({ error: 'Official yarn dataset could not be loaded' }); }
});

app.get('/api/live-yarn', (req, res) => {
  try {
    const d = readJson('live_yarn.json'), r = d.records || [], dates = r.map(x => x.date).filter(Boolean).sort(), latest = dates.at(-1);
    cache(res, 300); res.json({ records: r, count: r.length, latest_source_record: latest, latest_count: latest ? r.filter(x => x.date === latest).length : 0, source_tier: 'MARKET_INDICATOR' });
  } catch { res.status(500).json({ error: 'Market dataset could not be loaded' }); }
});

app.get('/api/operations', (req, res) => {
  try {
    const d = readJson('operations.json'), r = d.records || [];
    res.json({ records: r, count: r.length, connected: r.length > 0 });
  } catch { res.status(500).json({ error: 'Operations dataset could not be loaded' }); }
});

app.post('/api/forecast', forecastRateLimit, async (req, res) => {
  const validationError = validateForecastPayload(req.body);
  if (validationError) return res.status(400).json({ ok: false, error: validationError });

  const child = spawn(PYTHON_BIN, [join(__dirname, 'forecast.py')], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, PYTHONUNBUFFERED: '1' }
  });
  let out = '';
  let err = '';
  let settled = false;
  const MAX_OUTPUT = 2 * 1024 * 1024;
  const finish = fn => {
    if (!settled) { settled = true; fn(); }
  };

  child.stdout.on('data', chunk => {
    out += chunk.toString();
    if (out.length > MAX_OUTPUT) child.kill('SIGKILL');
  });
  child.stderr.on('data', chunk => {
    err += chunk.toString();
    if (err.length > 16_000) err = err.slice(-16_000);
  });
  child.on('error', error => {
    console.error('Forecast process error:', error.message);
    finish(() => res.status(500).json({ ok: false, error: 'Forecast engine is unavailable.' }));
  });
  child.on('close', code => {
    if (code !== 0) {
      console.error(`Forecast engine exited with code ${code}:`, err.trim());
      return finish(() => res.status(500).json({ ok: false, error: 'Forecast engine failed to execute.' }));
    }
    try {
      const result = JSON.parse(out);
      if (!result || result.ok !== true) return finish(() => res.status(422).json({ ok: false, error: 'Forecast could not be generated for the selected data.' }));
      return finish(() => res.json(result));
    } catch {
      console.error('Forecast engine returned non-JSON output:', out.slice(0, 1000), err.trim());
      return finish(() => res.status(500).json({ ok: false, error: 'Forecast engine returned invalid output.' }));
    }
  });
  child.stdin.on('error', e => console.error('Forecast stdin error:', e.message));
  child.stdin.end(JSON.stringify({ records: req.body.records, horizon: Number(req.body.horizon) }));
});

app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') return res.status(413).json({ ok: false, error: 'Request payload is too large.' });
  if (err instanceof SyntaxError && 'body' in err) return res.status(400).json({ ok: false, error: 'Malformed JSON request.' });
  console.error('Unhandled server error:', err?.message || err);
  return res.status(500).json({ ok: false, error: 'Internal server error.' });
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'textile-intelligence-platform', forecast_engine: 'python' }));
app.listen(PORT, '0.0.0.0', () => console.log(`Textile Intelligence Platform running on ${PORT}`));
