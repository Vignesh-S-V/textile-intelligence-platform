import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function loadDataset() {
  const path = join(process.cwd(), 'data', 'yarn.json');
  return JSON.parse(readFileSync(path, 'utf8'));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const data = loadDataset();
    const records = Array.isArray(data.records) ? data.records : [];
    const dates = records.map(r => r.date).filter(Boolean).sort();
    const ntc = records.filter(r => r.source_short === 'NTC');
    const fibers = [...new Set(records.map(r => r.fiber).filter(Boolean))].sort();
    const products = [...new Set(records.map(r => r.product).filter(Boolean))].sort();
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
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
  } catch (e) {
    console.error('Yarn dataset load failed:', e);
    return res.status(500).json({ error: 'Official yarn dataset could not be loaded', detail: e.message });
  }
}
