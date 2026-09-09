// api/prices.js
// Vercel Serverless Function for live Government of India mandi price data.
// IMPORTANT: DATA_GOV_API_KEY must be configured as a Vercel Environment Variable.
// Never commit the API key to GitHub.

const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
const API_BASE = `https://api.data.gov.in/resource/${RESOURCE_ID}`;

async function fetchAllCottonRecords(apiKey) {
  const pageSize = 100;
  let offset = 0;
  let total = Infinity;
  const all = [];

  while (offset < total && all.length < 2000) {
    const url = `${API_BASE}?api-key=${encodeURIComponent(apiKey)}&format=json&filters[commodity]=Cotton&offset=${offset}&limit=${pageSize}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });

    if (!res.ok) {
      throw new Error(`Govt API responded with HTTP ${res.status}`);
    }

    const json = await res.json();
    total = Number(json.total) || 0;
    const records = Array.isArray(json.records) ? json.records : [];

    if (records.length === 0) break;

    all.push(...records);
    offset += records.length;

    if (records.length < pageSize) break;
  }

  // Remove exact duplicates only; do not alter source values.
  const seen = new Set();
  return all.filter((r) => {
    const key = JSON.stringify([
      r.state,
      r.district,
      r.market,
      r.commodity,
      r.variety,
      r.grade,
      r.arrival_date,
      r.min_price,
      r.max_price,
      r.modal_price,
    ]);

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.DATA_GOV_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'DATA_GOV_API_KEY is not configured on the server.',
      setup: 'Add DATA_GOV_API_KEY in Vercel Project Settings > Environment Variables, then redeploy.',
    });
  }

  try {
    const records = await fetchAllCottonRecords(apiKey);

    return res.status(200).json({
      source: 'live',
      count: records.length,
      records,
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Government API fetch failed:', err);

    return res.status(502).json({
      error: 'Could not reach the government API right now.',
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
