"use client";

import React, { useState, useEffect, useMemo } from 'react';

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

interface ApiResponse {
  results: MarketPrice[];
  total: number;
  error?: string;
}

const EMPTY = '—';

export default function Home() {
  const [marketData, setMarketData] = useState<MarketPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    state: '', district: '', fiber: '', count: '', blend: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/market-prices');
        const data: ApiResponse = await response.json();
        setMarketData(Array.isArray(data.results) ? data.results : []);
        setBackendError(data.error ?? null);
      } catch (error) {
        console.error('Error fetching market prices:', error);
        setBackendError('Could not reach the backend.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const getDynamicOptions = (field: keyof typeof filters) => {
    if (!marketData.length) return [];
    const matching = marketData.filter((item) =>
      Object.entries(filters).every(([key, val]) => {
        if (key === field || !val) return true;
        return (item as any)[key] === val;
      })
    );
    return Array.from(new Set(matching.map((item) => (item as any)[field]).filter(Boolean))).sort();
  };

  const stateOptions = useMemo(() => getDynamicOptions('state'), [filters, marketData]);
  const districtOptions = useMemo(() => getDynamicOptions('district'), [filters, marketData]);
  const fiberOptions = useMemo(() => getDynamicOptions('fiber'), [filters, marketData]);
  const countOptions = useMemo(() => getDynamicOptions('count'), [filters, marketData]);
  const blendOptions = useMemo(() => getDynamicOptions('blend'), [filters, marketData]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const clearAllFilters = () => setFilters({ state: '', district: '', fiber: '', count: '', blend: '' });

  const finalFilteredData = marketData.filter((item) =>
    Object.entries(filters).every(([key, val]) => !val || (item as any)[key] === val)
  );

  const priceLabel = (status: MarketPrice['verification_status']) =>
    status === 'VERIFIED' ? 'Verified Market Price' : 'Unverified — not a confirmed price';

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', padding: '20px', color: '#0f172a' }}>
      <div style={{ textAlign: 'center', marginBottom: '25px', paddingTop: '10px', paddingBottom: '20px', borderBottom: '2px solid #e2e8f0' }}>
        <h1 style={{ fontSize: '30px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '0.5px' }}>
          TEXTILE INTELLIGENCE PLATFORM
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1.5px', margin: 0 }}>
          Real-time Yarn • Loom • Fabric • Market Intelligence
        </p>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {backendError && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
            {backendError}
          </div>
        )}

        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #cbd5e1', marginBottom: '25px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px' }}>
            <div style={filterBoxStyle}>
              <label style={labelStyle}>State ({stateOptions.length})</label>
              <select name="state" value={filters.state} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All States</option>
                {stateOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div style={filterBoxStyle}>
              <label style={labelStyle}>District ({districtOptions.length})</label>
              <select name="district" value={filters.district} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All Districts</option>
                {districtOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div style={filterBoxStyle}>
              <label style={labelStyle}>Fiber ({fiberOptions.length})</label>
              <select name="fiber" value={filters.fiber} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All Fibers</option>
                {fiberOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div style={filterBoxStyle}>
              <label style={labelStyle}>Count ({countOptions.length})</label>
              <select name="count" value={filters.count} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All Counts</option>
                {countOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div style={filterBoxStyle}>
              <label style={labelStyle}>Blend ({blendOptions.length})</label>
              <select name="blend" value={filters.blend} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All Blends</option>
                {blendOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <button onClick={clearAllFilters} style={{ backgroundColor: '#ef4444', color: '#ffffff', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', height: '36px' }}>
                Clear All
              </button>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #cbd5e1' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
            Historical Market Data ({finalFilteredData.length} Records)
          </h2>

          {isLoading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Loading verified database records...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={thStyle}>State</th>
                    <th style={thStyle}>District</th>
                    <th style={thStyle}>Market</th>
                    <th style={thStyle}>Fiber</th>
                    <th style={thStyle}>Yarn Name</th>
                    <th style={thStyle}>Count</th>
                    <th style={thStyle}>Blend</th>
                    <th style={thStyle}>Effective Date</th>
                    <th style={thStyle}>Price</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {finalFilteredData.length > 0 ? (
                    finalFilteredData.map((row) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={tdStyle}>{row.state ?? EMPTY}</td>
                        <td style={tdStyle}>{row.district ?? EMPTY}</td>
                        <td style={tdStyle}>{row.market ?? EMPTY}</td>
                        <td style={tdStyle}><strong>{row.fiber}</strong></td>
                        <td style={tdStyle}>{row.yarn}</td>
                        <td style={tdStyle}>{row.count}</td>
                        <td style={tdStyle}>{row.blend ?? EMPTY}</td>
                        <td style={tdStyle}>{new Date(row.effective_date).toLocaleDateString()}</td>
                        <td style={{ ...tdStyle, fontWeight: '700', color: row.verification_status === 'VERIFIED' ? '#16a34a' : '#b45309', fontSize: '14px' }}>
                          {row.currency} {row.price.toFixed(2)} / {row.unit}
                        </td>
                        <td style={{ ...tdStyle, fontSize: '11px', fontWeight: 700, color: row.verification_status === 'VERIFIED' ? '#16a34a' : '#b45309' }}>
                          {priceLabel(row.verification_status)}
                        </td>
                        <td style={tdStyle}>
                          <a href={row.source_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>{row.source_name}</a>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '15px' }}>
                        No verified data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const filterBoxStyle: React.CSSProperties = { flex: '1 1 115px', minWidth: '115px' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '5px', textTransform: 'uppercase' };
const selectStyle: React.CSSProperties = { width: '100%', padding: '8px 8px', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '12px', backgroundColor: '#ffffff', color: '#0f172a', cursor: 'pointer' };
const thStyle: React.CSSProperties = { padding: '12px 10px', color: '#475569', fontWeight: '700', textTransform: 'uppercase', fontSize: '12px' };
const tdStyle: React.CSSProperties = { padding: '12px 10px', color: '#0f172a' };
