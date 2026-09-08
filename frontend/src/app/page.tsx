"use client";

import React, { useState, useEffect, useCallback } from 'react';

// ── types ──────────────────────────────────────────────────────────────────
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

const EMPTY = '—';
const MONTH_NAMES = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// ── helpers ────────────────────────────────────────────────────────────────
function statusColor(s: string) {
  return s === 'VERIFIED' ? '#16a34a' : s === 'PARTIALLY_VERIFIED' ? '#d97706' : '#b45309';
}
function statusLabel(s: string) {
  if (s === 'VERIFIED') return 'Verified';
  if (s === 'PARTIALLY_VERIFIED') return 'Partially Verified';
  return 'Unverified';
}

// ── component ──────────────────────────────────────────────────────────────
export default function Home() {
  const [meta, setMeta] = useState<FilterMeta | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    state: '', district: '', fiber: '', count: '',
    blend: '', spinning_type: '', yarn_name: '', market: '',
    year: '', month: '',
  });

  const [rows, setRows] = useState<MarketPrice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // ── fetch filter metadata ────────────────────────────────────────────────
  useEffect(() => {
    setLoadingMeta(true);
    fetch('/api/filter-metadata')
      .then(r => r.json())
      .then(d => {
        if (d.error) setMetaError(d.error);
        else setMeta(d);
      })
      .catch(() => setMetaError('Could not load filter options.'))
      .finally(() => setLoadingMeta(false));
  }, []);

  // ── fetch market data ────────────────────────────────────────────────────
  const fetchData = useCallback(() => {
    setLoadingData(true);
    setDataError(null);
    const params = new URLSearchParams({ page: String(page), page_size: '50' });
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });

    fetch(`/api/market-prices?${params}`)
      .then(r => r.json())
      .then((d: ApiResponse) => {
        setRows(Array.isArray(d.results) ? d.results : []);
        setTotal(d.total ?? 0);
        if (d.error) setDataError(d.error);
      })
      .catch(() => setDataError('Could not reach the backend.'))
      .finally(() => setLoadingData(false));
  }, [filters, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── handlers ─────────────────────────────────────────────────────────────
  const handleFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const clearAll = () => {
    setFilters({
      state: '', district: '', fiber: '', count: '',
      blend: '', spinning_type: '', yarn_name: '', market: '',
      year: '', month: '',
    });
    setPage(1);
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>TEXTILE INTELLIGENCE PLATFORM</h1>
        <p style={styles.subtitle}>Real-time Yarn · Loom · Fabric · Market Intelligence</p>
      </div>

      <div style={styles.container}>
        {/* Meta / backend errors */}
        {(metaError || dataError) && (
          <div style={styles.errorBanner}>
            {metaError || dataError}
          </div>
        )}

        {/* Filter bar */}
        <div style={styles.filterBar}>
          {loadingMeta ? (
            <p style={{ color: '#64748b', fontSize: 13 }}>Loading filter options…</p>
          ) : !meta || (
            meta.states.length === 0 && meta.fibers.length === 0 &&
            meta.yarns.length === 0 && meta.counts.length === 0
          ) ? (
            <p style={{ color: '#64748b', fontSize: 13 }}>
              No verified yarn-price data available — filters will populate once verified records are ingested.
            </p>
          ) : (
            <div style={styles.filterGrid}>
              <FilterSelect name="state"        label="State"        value={filters.state}        options={meta.states}          onChange={handleFilter} />
              <FilterSelect name="district"     label="District"     value={filters.district}     options={meta.districts}       onChange={handleFilter} />
              <FilterSelect name="market"       label="Market"       value={filters.market}       options={meta.markets}         onChange={handleFilter} />
              <FilterSelect name="fiber"        label="Fiber"        value={filters.fiber}        options={meta.fibers}          onChange={handleFilter} />
              <FilterSelect name="yarn_name"    label="Yarn"         value={filters.yarn_name}    options={meta.yarns}           onChange={handleFilter} />
              <FilterSelect name="count"        label="Count"        value={filters.count}        options={meta.counts}          onChange={handleFilter} />
              <FilterSelect name="spinning_type" label="Spinning"   value={filters.spinning_type} options={meta.spinning_types}  onChange={handleFilter} />
              <FilterSelect name="blend"        label="Blend"        value={filters.blend}        options={meta.blends}          onChange={handleFilter} />
              <FilterSelect name="year"         label="Year"         value={filters.year}         options={meta.years.map(String)} onChange={handleFilter} />
              <FilterSelect name="month"        label="Month"        value={filters.month}
                options={meta.months.map(m => String(m))}
                labels={meta.months.map(m => MONTH_NAMES[m])}
                onChange={handleFilter}
              />
              <div style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
                <button onClick={clearAll} style={styles.clearBtn}>Clear All</button>
              </div>
            </div>
          )}
        </div>

        {/* Data table */}
        <div style={styles.tableCard}>
          <h2 style={styles.tableTitle}>
            Historical Market Data ({loadingData ? '…' : total} Records)
          </h2>

          {loadingData ? (
            <p style={styles.emptyMsg}>Loading verified database records…</p>
          ) : rows.length === 0 ? (
            <p style={styles.emptyMsg}>No verified data available.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thead}>
                    {['State','District','Market','Fiber','Yarn','Count','Blend','Date','Price','Status','Source'].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} style={styles.tr}>
                      <td style={styles.td}>{row.state ?? EMPTY}</td>
                      <td style={styles.td}>{row.district ?? EMPTY}</td>
                      <td style={styles.td}>{row.market ?? EMPTY}</td>
                      <td style={styles.td}><strong>{row.fiber}</strong></td>
                      <td style={styles.td}>{row.yarn}</td>
                      <td style={styles.td}>{row.count}</td>
                      <td style={styles.td}>{row.blend ?? EMPTY}</td>
                      <td style={styles.td}>{new Date(row.effective_date).toLocaleDateString()}</td>
                      <td style={{ ...styles.td, fontWeight: 700, color: statusColor(row.verification_status) }}>
                        {row.currency} {row.price.toFixed(2)} / {row.unit}
                      </td>
                      <td style={{ ...styles.td, fontSize: 11, fontWeight: 700, color: statusColor(row.verification_status) }}>
                        {statusLabel(row.verification_status)}
                      </td>
                      <td style={styles.td}>
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

          {/* Pagination */}
          {total > 50 && !loadingData && (
            <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={styles.pageBtn}>← Prev</button>
              <span style={{ fontSize: 13 }}>Page {page} / {Math.ceil(total / 50)}</span>
              <button disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(p => p + 1)} style={styles.pageBtn}>Next →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── FilterSelect sub-component ─────────────────────────────────────────────
function FilterSelect({
  name, label, value, options, labels, onChange,
}: {
  name: string;
  label: string;
  value: string;
  options: string[];
  labels?: string[];
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <div style={{ flex: '1 1 120px', minWidth: 110 }}>
      <label style={styles.label}>{label} ({options.length})</label>
      <select name={name} value={value} onChange={onChange} style={styles.select}>
        <option value="">All</option>
        {options.map((opt, i) => (
          <option key={opt} value={opt}>{labels ? labels[i] : opt}</option>
        ))}
      </select>
    </div>
  );
}

// ── styles ─────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: { fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', padding: 20, color: '#0f172a' },
  header: { textAlign: 'center', marginBottom: 25, paddingBottom: 20, borderBottom: '2px solid #e2e8f0' },
  title: { fontSize: 30, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: 0.5 },
  subtitle: { fontSize: 13, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, margin: 0 },
  container: { maxWidth: 1400, margin: '0 auto' },
  errorBanner: { backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 },
  filterBar: { backgroundColor: '#fff', padding: 20, borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,.06)', border: '1px solid #cbd5e1', marginBottom: 25 },
  filterGrid: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 },
  label: { display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 5, textTransform: 'uppercase' },
  select: { width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #94a3b8', fontSize: 12, backgroundColor: '#fff', color: '#0f172a', cursor: 'pointer' },
  clearBtn: { backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer', height: 36 },
  tableCard: { backgroundColor: '#fff', padding: 24, borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,.06)', border: '1px solid #cbd5e1' },
  tableTitle: { fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 16px', borderBottom: '1px solid #e2e8f0', paddingBottom: 10 },
  emptyMsg: { padding: 30, textAlign: 'center', color: '#64748b', fontSize: 15 },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 },
  thead: { backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1' },
  th: { padding: '12px 10px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', fontSize: 12 },
  tr: { borderBottom: '1px solid #e2e8f0' },
  td: { padding: '12px 10px', color: '#0f172a' },
  pageBtn: { padding: '6px 14px', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer', fontSize: 13, backgroundColor: '#fff' },
};
