// api/yarn.js
// Official-source yarn price scraper for the Textile Intelligence Platform.
// Primary source: Office of the Textile Commissioner (Ministry of Textiles), India.
// Historical official report currently published by the source covers Jan-2021 to Mar-2025.
// The current weekly report is attempted separately so the dashboard can extend to the latest
// published observation without pretending that missing months exist.

const HISTORICAL_URL = 'https://www.txcindia.gov.in/html/ecomicsection/Cotton%20Yarn%20Prices.pdf';
const CURRENT_WEEKLY_URL = 'https://txcindia.gov.in/html/pricessheet3.pdf';

const CENTRE_META = {
  Coimbatore: { state: 'Tamil Nadu', district: 'Coimbatore' },
  Amritsar: { state: 'Punjab', district: 'Amritsar' },
  Ahmedabad: { state: 'Gujarat', district: 'Ahmedabad' },
};

const MONTHS = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function cleanLine(line) {
  return line.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseMonthToken(token) {
  const m = token.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{2})$/i);
  if (!m) return null;
  const month = MONTHS[m[1][0].toUpperCase() + m[1].slice(1, 3).toLowerCase()];
  const year = 2000 + Number(m[2]);
  return new Date(Date.UTC(year, month, 1));
}

function numberOrNull(value) {
  if (!value || value === '-') return null;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function tokenizeRow(line) {
  return cleanLine(line).split(' ').filter(Boolean);
}

function parseHistoricalText(text) {
  const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const records = [];
  let section = null;
  let centre = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (/Annexure-I/i.test(line)) section = 'Cone Combed';
    if (/Annexure-II/i.test(line)) section = 'Hosiery Combed';

    const centreMatch = line.match(/Centre-?\s*wise details:\s*([A-Za-z ]+)/i);
    if (centreMatch) {
      const candidate = centreMatch[1].trim();
      centre = Object.keys(CENTRE_META).find((x) => candidate.toLowerCase().startsWith(x.toLowerCase())) || null;
      continue;
    }

    // The PDF text extractor keeps monthly rows as: Jan-21 <price> <arrow> <growth> ...
    const tokens = tokenizeRow(line);
    if (!tokens.length) continue;
    const date = parseMonthToken(tokens[0]);
    if (!date || !centre || !section) continue;

    const counts = section === 'Cone Combed' ? ['20s', '30s', '40s', '60s', '80s'] : ['20s', '30s', '40s'];
    const values = tokens.slice(1);

    // Each count contributes price, direction and growth. Missing values are represented by '-'.
    // Taking the first token of each group is robust to arrows and percentage tokens.
    let cursor = 0;
    for (const count of counts) {
      const priceToken = values[cursor];
      const price = numberOrNull(priceToken);
      if (price !== null) {
        records.push({
          date: date.toISOString().slice(0, 10),
          year: date.getUTCFullYear(),
          month: date.getUTCMonth() + 1,
          state: CENTRE_META[centre].state,
          district: CENTRE_META[centre].district,
          centre,
          fiber: 'Cotton',
          count,
          blend: section,
          price_inr_kg: price,
          frequency: 'Monthly',
          source: 'Office of the Textile Commissioner',
          source_url: HISTORICAL_URL,
        });
      }

      // Normal row = price + direction + growth. Missing groups can collapse to one '-'.
      cursor += priceToken === '-' ? 1 : 3;
    }
  }

  return records;
}

function dedupe(records) {
  const seen = new Set();
  return records.filter((r) => {
    const key = [r.date, r.centre, r.blend, r.count, r.price_inr_kg].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchPdf(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Textile-Intelligence-Platform/1.0' },
  });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function parsePdf(buffer) {
  const pdfParse = (await import('pdf-parse')).default;
  const parsed = await pdfParse(buffer);
  return parsed.text || '';
}

async function fetchHistorical() {
  const buffer = await fetchPdf(HISTORICAL_URL);
  const text = await parsePdf(buffer);
  return parseHistoricalText(text);
}

// The current weekly PDF has changed layout over time. We keep this parser intentionally
// conservative: only rows that can be identified without guessing are returned.
function parseCurrentWeeklyText(text) {
  const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const records = [];
  let currentCentre = null;

  for (const line of lines) {
    const centreMatch = line.match(/(?:Centre|Center)\s*[:\-]\s*([A-Za-z ]+)/i);
    if (centreMatch) {
      currentCentre = Object.keys(CENTRE_META).find((x) => centreMatch[1].toLowerCase().includes(x.toLowerCase())) || currentCentre;
    }

    // Conservative support for rows such as: 20s 267 288 316 or 20s 267.
    const row = line.match(/^(20s|30s|40s|60s|80s)\s+(\d+(?:\.\d+)?)\b/i);
    if (!row || !currentCentre) continue;

    const price = Number(row[2]);
    if (!Number.isFinite(price)) continue;

    records.push({
      date: new Date().toISOString().slice(0, 10),
      year: new Date().getUTCFullYear(),
      month: new Date().getUTCMonth() + 1,
      state: CENTRE_META[currentCentre].state,
      district: CENTRE_META[currentCentre].district,
      centre: currentCentre,
      fiber: 'Cotton',
      count: row[1],
      blend: 'Current Weekly Report',
      price_inr_kg: price,
      frequency: 'Weekly',
      source: 'Office of the Textile Commissioner',
      source_url: CURRENT_WEEKLY_URL,
    });
  }

  return records;
}

async function fetchCurrentWeekly() {
  try {
    const buffer = await fetchPdf(CURRENT_WEEKLY_URL);
    const text = await parsePdf(buffer);
    return parseCurrentWeeklyText(text);
  } catch (error) {
    console.warn('Current weekly yarn report unavailable:', error.message);
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const [historical, current] = await Promise.all([
      fetchHistorical(),
      fetchCurrentWeekly(),
    ]);

    const records = dedupe([...historical, ...current]).sort((a, b) =>
      a.date.localeCompare(b.date) || a.state.localeCompare(b.state) || a.count.localeCompare(b.count)
    );

    const dates = records.map((r) => r.date).sort();

    return res.status(200).json({
      source: 'official-textile-commissioner',
      records,
      count: records.length,
      coverage: {
        requested_from: '2021-09-09',
        latest_available: dates.at(-1) || null,
        historical_report: 'January 2021 to March 2025',
        current_weekly_attempted: true,
      },
      fetched_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Yarn scraper failed:', error);
    return res.status(502).json({
      error: 'Could not scrape the official yarn price source.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
