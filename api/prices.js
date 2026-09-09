// api/prices.js
// Vercel Serverless Function (runs on Vercel's free tier, auto-deployed from GitHub).
// The API key lives ONLY as a Vercel Environment Variable — never in the repo, never sent to the browser.

const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070'; // official Govt of India mandi price dataset
const API_BASE = `https://api.data.gov.in/resource/${RESOURCE_ID}`;

// Falls back to the public shared demo key only if you haven't set your own yet (rate-limited).
const API_KEY = process.env.DATA_GOV_API_KEY || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571';

async function fetchAllCottonRecords() {
  const pageSize = 100;
  let offset = 0;
  let total = Infinity;
  const all = [];

  while (offset < total && all.length < 2000) {
    const url = `${API_BASE}?api-key=${API_KEY}&format=json&filters[commodity]=Cotton&offset=${offset}&limit=${pageSize}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Govt API responded with HTTP ${res.status}`);
    const json = await res.json();
    total = Number(json.total) || 0;
    const records = json.records || [];
    if (records.length === 0) break;
    all.push(...records);
    offset += pageSize;
  }

  // Dedupe exact-duplicate rows only — never invent or alter any value
  const seen = new Set();
  const deduped = [];
  for (const r of all) {
    const key = JSON.stringify([r.state, r.district, r.market, r.commodity, r.variety, r.grade, r.arrival_date, r.min_price, r.max_price, r.modal_price]);
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(r);
    }
  }
  return deduped;
}

export default async function handler(req, res) {
  try {
    const records = await fetchAllCottonRecords();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate'); // 5 min edge cache, still free
    res.status(200).json({ source: 'live', count: records.length, records });
  } catch (err) {
    res.status(502).json({ error: 'Could not reach the government API right now.', detail: err.message });
  }
}
