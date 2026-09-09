import express from 'express';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const PORT = process.env.PORT || 10000;

app.disable('x-powered-by');
app.use(express.static(__dirname));

app.get('/api/yarn', (req, res) => {
  try {
    const data = JSON.parse(readFileSync(join(__dirname, 'data', 'yarn.json'), 'utf8'));
    const records = Array.isArray(data.records) ? data.records : [];
    const dates = records.map(r => r.date).filter(Boolean).sort();
    const ntc = records.filter(r => r.source_short === 'NTC');
    const fibers = [...new Set(records.map(r => r.fiber).filter(Boolean))].sort();
    const products = [...new Set(records.map(r => r.product).filter(Boolean))].sort();

    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({
      source: data.source || 'official-textile-sources',
      records,
      count: records.length,
      fiber_types: fibers,
      product_types: products,
      coverage: {
        ...(data.coverage || {}),
        latest_source_record: dates.at(-1) || null,
        ntc_post_mar_2025_records: ntc.length
      }
    });
  } catch (error) {
    console.error('Yarn dataset load failed:', error);
    res.status(500).json({
      error: 'Official yarn dataset could not be loaded'
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'textile-intelligence-platform' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Textile Intelligence Platform running on port ${PORT}`);
});
