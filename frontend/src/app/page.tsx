"use client";

import React, { useState, useEffect, useCallback } from 'react';

interface MarketPrice {
  id: number;
  state: string | null;
  district: string | null;
  market: string | null;
  fiber: string;
  yarn: string;
  count: string;
  spinning_type: string | null;
  blend: string | null;
  price: number;
  unit: string;
  currency: string;
  effective_date: string;
  verification_status: 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'UNVERIFIED' | 'UNAVAILABLE';
  confidence: number | null;
  source_name: string;
  source_url: string;
  collected_at: string;
}

interface FilterMeta {
  states: string[];
  districts: string[];
  fibers: string[];
  counts: string[];
  spinning_types: string[];
  blends: string[];
  yarns: string[];
  markets: string[];
  years: number[];
  months: number[];
}

interface ApiResponse {
  results: MarketPrice[];
  total: number;
  page: number;
  page_size: number;
  error?: string;
}

const EMPTY_META: FilterMeta = {
  states: [], districts: [], fibers: [], counts: [],
  spinning_types: [], blends: [], yarns: [], markets: [],
  years: [], months: [],
};

const EMPTY = '—';
const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function statusColor(s: string) {
  return s === 'VERIFIED' ? '#16a34a' : s === 'PARTIALLY_VERIFIED' ? '#d97706' : '#b45309';
}
function statusLabel(s: string) {
  if (s === 'VERIFIED') return 'Verified';
  if (s === 'PARTIALLY_VERIFIED') return 'Partially Verified';
  return 'Unverified';
}
function hasAnyOptions(m: FilterMeta) {
  return m.states.length > 0 || m.fibers.length > 0 || m.yarns.length > 0 || m.counts.length > 0;
}

export default function Home() {
  const [meta, setMeta] = useState<FilterMeta>(EMPTY_META);
  const [metaLoading, setMetaLoading] = useState(true);
  const [backendDown, setBackendDown] = useState(false);

  const [filters, setFilters] = useState({
    state: '', district: '', fiber: '', count: '',
    blend: '', spinning_type: '', yarn_name: '', market: '',
    year: '', month: '',
  });

  const [rows, setRows] = useState<MarketPrice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    setMetaLoading(true);
    fetch('/api/filter-metadata')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => {
        if (d && !d.error) {
          setMeta({
            states:        Array.isArray(d.states)         ? d.states         : [],
            districts:     Array.isArray(d.districts)      ? d.districts      : [],
            fibers:        Array.isArray(d.fibers)         ? d.fibers         : [],
            counts:        Array.isArray(d.counts)         ? d.counts         : [],
            spinning_types:Array.isArray(d.spinning_types) ? d.spinning_types : [],
            blends:        Array.isArray(d.blends)         ? d.blends         : [],
            yarns:         Array.isArray(d.yarns)          ? d.yarns          : [],
            markets:       Array.isArray(d.markets)        ? d.markets        : [],
            years:         Array.isArray(d.years)          ? d.years          : [],
            months:        Array.isArray(d.months)         ? d.months         : [],
          });
        }
      })
      .catch(() => setBackendDown(true))
      .finally(() => setMetaLoading(false));
  }, []);

  const fetchData = useCallback(() => {
    setLoadingData(true);
    const params = new URLSearchParams({ page: String(page), page_size: '50' });
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    fetch(`/api/market-prices?${params}`)
      .then(r => r.json())
      .then((d: ApiResponse) => {
        setRows(Array.isArray(d.results) ? d.results : []);
        setTotal(d.total ?? 0);
        if (d.error && d.error.toLowerCase().includes('unavailable')) setBackendDown(true);
      })
      .catch(() => setBackendDown(true))
      .finally(() => setLoadingData(false));
  }, [filters, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setPage(1);
  };

  const clearAll = () => {
    setFilters({ state: '', district: '', fiber: '', count: '',
      blend: '', spinning_type: '', yarn_name: '', market: '', year: '', month: '' });
    setPage(1);
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>TEXTILE INTELLIGENCE PLATFORM</h1>
        <p style={S.subtitle}>Real-time Yarn · Loom · Fabric · Market Intelligence</p>
      </div>

      <div style={S.container}>
        {backendDown && (
          <div style={S.errorBanner}>
            ⚠ Could not reach the backend API. Please check that <code>BACKEND_API_URL</code> is
            set correctly in Vercel environment variables and the Render backend is running.
          </div>
        )}

        <div style={S.filterBar}>
          {metaLoading ? (
            <p style={S.muted}>Loading filter options…</p>
          ) : !hasAnyOptions(meta) ? (
            <p style={S.muted}>
              No verified yarn-price records in the database yet.
              Filter dropdowns will populate automatically once verified data is ingested.
            </p>
          ) : (
            <div style={S.filterGrid}>
              <Sel name="state"         label="State"    value={filters.state}         opts={meta.states}            onChange={handleFilter} />
              <Sel name="district"      label="District" value={filters.district}      opts={meta.districts}         onChange={handleFilter} />
              <Sel name="market"        label="Market"   value={filters.market}        opts={meta.markets}           onChange={handleFilter} />
              <Sel name="fiber"         label="Fiber"    value={filters.fiber}         opts={meta.fibers}            onChange={handleFilter} />
              <Sel name="yarn_name"     label="Yarn"     value={filters.yarn_name}     opts={meta.yarns}             onChange={handleFilter} />
              <Sel name="count"         label="Count"    value={filters.count}         opts={meta.counts}            onChange={handleFilter} />
              <Sel name="spinning_type" label="Spinning" value={filters.spinning_type} opts={meta.spinning_types}    onChange={handleFilter} />
              <Sel name="blend"         label="Blend"    value={filters.blend}         opts={meta.blends}            onChange={handleFilter} />
              <Sel name="year"          label="Year"     value={filters.year}          opts={meta.years.map(String)} onChange={handleFilter} />
              <Sel name="month" label="Month" value={filters.month}
                opts={meta.months.map(String)}
                labels={meta.months.map(m => MONTH_NAMES[m] ?? String(m))}
                onChange={handleFilter} />
              <div style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
                <button onClick={clearAll} style={S.clearBtn}>Clear All</button>
              </div>
            </div>
          )}
        </div>

        <div style={S.tableCard}>
          <h2 style={S.tableTitle}>
            Historical Market Data ({loadingData ? '…' : total.toLocaleString()} Records)
          </h2>

          {loadingData ? (
            <p style={S.emptyMsg}>Loading verified database records…</p>
          ) : rows.length === 0 ? (
            <p style={S.emptyMsg}>No verified data available.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={S.table}>
                <thead>
                  <tr style={S.thead}>
                    {['State','District','Market','Fiber','Yarn','Count','Blend','Date','Price','Status','Source'].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} style={S.tr}>
                      <td style={S.td}>{row.state ?? EMPTY}</td>
                      <td style={S.td}>{row.district ?? EMPTY}</td>
                      <td style={S.td}>{row.market ?? EMPTY}</td>
                      <td style={S.td}><strong>{row.fiber}</strong></td>
                      <td style={S.td}>{row.yarn}</td>
                      <td style={S.td}>{row.count}</td>
                      <td style={S.td}>{row.blend ?? EMPTY}</td>
                      <td style={S.td}>{new Date(row.effective_date).toLocaleDateString()}</td>
                      <td style={{ ...S.td, fontWeight: 700, color: statusColor(row.verification_status) }}>
                        {row.currency} {row.price.toFixed(2)} / {row.unit}
                      </td>
                      <td style={{ ...S.td, fontSize: 11, fontWeight: 700, color: statusColor(row.verification_status) }}>
                        {statusLabel(row.verification_status)}
                      </td>
                      <td style={S.td}>
                        <a href={row.source_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                          {row.source_name}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {total > 50 && !loadingData && (
            <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={S.pageBtn}>← Prev</button>
              <span style={{ fontSize: 13, color: '#64748b' }}>Page {page} / {Math.ceil(total / 50)}</span>
              <button disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(p => p + 1)} style={S.pageBtn}>Next →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Sel({ name, label, value, opts, labels, onChange }: {
  name: string; label: string; value: string;
  opts: string[]; labels?: string[];
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <div style={{ flex: '1 1 120px', minWidth: 110 }}>
      <label style={S.label}>{label} ({opts.length})</label>
      <select name={name} value={value} onChange={onChange} style={S.select}>
        <option value="">All</option>
        {opts.map((o, i) => <option key={o} value={o}>{labels ? labels[i] : o}</option>)}
      </select>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page:       { fontFamily: 'system-ui,-apple-system,sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', padding: 20, color: '#0f172a' },
  header:     { textAlign: 'center', marginBottom: 25, paddingBottom: 20, borderBottom: '2px solid #e2e8f0' },
  title:      { fontSize: 30, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: 0.5 },
  subtitle:   { fontSize: 13, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, margin: 0 },
  container:  { maxWidth: 1400, margin: '0 auto' },
  errorBanner:{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 },
  filterBar:  { backgroundColor: '#fff', padding: 20, borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,.06)', border: '1px solid #cbd5e1', marginBottom: 25 },
  filterGrid: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 },
  muted:      { color: '#64748b', fontSize: 13, margin: 0 },
  label:      { display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 5, textTransform: 'uppercase' },
  select:     { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #94a3b8', fontSize: 12, backgroundColor: '#fff', color: '#0f172a', cursor: 'pointer' },
  clearBtn:   { backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer', height: 36 },
  tableCard:  { backgroundColor: '#fff', padding: 24, borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,.06)', border: '1px solid #cbd5e1' },
  tableTitle: { fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 16px', borderBottom: '1px solid #e2e8f0', paddingBottom: 10 },
  emptyMsg:   { padding: 30, textAlign: 'center', color: '#64748b', fontSize: 15, margin: 0 },
  table:      { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 },
  thead:      { backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1' },
  th:         { padding: '12px 10px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', fontSize: 12 },
  tr:         { borderBottom: '1px solid #e2e8f0' },
  td:         { padding: '12px 10px', color: '#0f172a' },
  pageBtn:    { padding: '6px 14px', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer', fontSize: 13, backgroundColor: '#fff' },
};
