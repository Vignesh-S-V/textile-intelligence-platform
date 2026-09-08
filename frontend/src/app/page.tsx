"use client";

import React, { useState, useEffect, useMemo } from 'react';

// Define the structure of your real database rows
interface MarketData {
  id: number;
  state: string;
  district: string;
  fiber: string;
  yarnType: string;
  count: string;
  spinning: string;
  blend: string;
  yarn: string;
  year: string;
  month: string;
  price: string; // Real exact price from DB
}

export default function Home() {
  // Store real data fetched from your database
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filters, setFilters] = useState({
    state: '', district: '', fiber: '', yarnType: '', count: '', spinning: '', blend: '', yarn: '', year: '', month: ''
  });

  // Fetch Real Data on Component Mount
  useEffect(() => {
    const fetchRealData = async () => {
      try {
        // Ithu unga backend API endpoint (e.g., pulling from SQL views)
        const response = await fetch('/api/market-prices');
        const data = await response.json();
        setMarketData(data);
      } catch (error) {
        console.error("Error fetching real market prices:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRealData();
  }, []);

  // Dynamic Options Extractor Function
  const getDynamicOptions = (field: keyof typeof filters) => {
    const matchingData = marketData.filter(item => {
      return Object.entries(filters).every(([key, val]) => {
        if (key === field || !val) return true; 
        return item[key as keyof typeof item] === val;
      });
    });
    const uniqueVals = Array.from(new Set(matchingData.map(item => item[field])));
    return uniqueVals.sort();
  };

  const stateOptions = useMemo(() => getDynamicOptions('state'), [filters, marketData]);
  const districtOptions = useMemo(() => getDynamicOptions('district'), [filters, marketData]);
  const fiberOptions = useMemo(() => getDynamicOptions('fiber'), [filters, marketData]);
  const yarnTypeOptions = useMemo(() => getDynamicOptions('yarnType'), [filters, marketData]);
  const countOptions = useMemo(() => getDynamicOptions('count'), [filters, marketData]);
  const spinningOptions = useMemo(() => getDynamicOptions('spinning'), [filters, marketData]);
  const blendOptions = useMemo(() => getDynamicOptions('blend'), [filters, marketData]);
  const yarnOptions = useMemo(() => getDynamicOptions('yarn'), [filters, marketData]);
  const yearOptions = useMemo(() => getDynamicOptions('year'), [filters, marketData]);
  const monthOptions = useMemo(() => getDynamicOptions('month'), [filters, marketData]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      state: '', district: '', fiber: '', yarnType: '', count: '', spinning: '', blend: '', yarn: '', year: '', month: ''
    });
  };

  // Filtered dataset for output table
  const finalFilteredData = marketData.filter(item => {
    return Object.entries(filters).every(([key, val]) => {
      return !val || item[key as keyof typeof item] === val;
    });
  });

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', padding: '20px', color: '#0f172a' }}>
      
      {/* HEADER SECTION */}
      <div style={{ textAlign: 'center', marginBottom: '25px', paddingTop: '10px', paddingBottom: '20px', borderBottom: '2px solid #e2e8f0' }}>
        <h1 style={{ fontSize: '30px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '0.5px' }}>
          TEXTILE INTELLIGENCE PLATFORM
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1.5px', margin: 0 }}>
          Real-time Yarn • Loom • Fabric • Market Intelligence
        </p>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* FILTERS BAR */}
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #cbd5e1', marginBottom: '25px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px' }}>
            
            <div style={filterBoxStyle}>
              <label style={labelStyle}>Fiber</label>
              <select name="fiber" value={filters.fiber} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All Fibers</option>
                {fiberOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            
            <div style={filterBoxStyle}>
              <label style={labelStyle}>Yarn Type</label>
              <select name="yarnType" value={filters.yarnType} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All Yarn Types</option>
                {yarnTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            
            <div style={filterBoxStyle}>
              <label style={labelStyle}>Count</label>
              <select name="count" value={filters.count} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All Counts</option>
                {countOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            
            <div style={filterBoxStyle}>
              <label style={labelStyle}>Spinning</label>
              <select name="spinning" value={filters.spinning} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All Spinning Types</option>
                {spinningOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            
            <div style={filterBoxStyle}>
              <label style={labelStyle}>Blend</label>
              <select name="blend" value={filters.blend} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All Blends</option>
                {blendOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            
            <div style={filterBoxStyle}>
              <label style={labelStyle}>Yarn Name</label>
              <select name="yarn" value={filters.yarn} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All Yarns</option>
                {yarnOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            <div style={{ flex: '1 1 100px', minWidth: '100px' }}>
              <label style={labelStyle}>Year</label>
              <select name="year" value={filters.year} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All Years</option>
                {yearOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            <div style={{ flex: '1 1 100px', minWidth: '100px' }}>
              <label style={labelStyle}>Month</label>
              <select name="month" value={filters.month} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All Months</option>
                {monthOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            <div style={{ marginLeft: 'auto' }}>
              <button onClick={clearAllFilters} style={{ backgroundColor: '#ef4444', color: '#ffffff', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', height: '36px' }}>
                Clear All
              </button>
            </div>

          </div>
        </div>

        {/* ACTIVE DATA SHEET */}
        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #cbd5e1' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
            Historical Market Data ({finalFilteredData.length} Records)
          </h2>
          
          {isLoading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Loading exact market prices from database...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={thStyle}>Fiber</th>
                    <th style={thStyle}>Yarn Name</th>
                    <th style={thStyle}>Count</th>
                    <th style={thStyle}>Blend</th>
                    <th style={thStyle}>Year</th>
                    <th style={thStyle}>Month</th>
                    <th style={{ ...thStyle, color: '#16a34a' }}>Actual Price (/kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {finalFilteredData.length > 0 ? (
                    finalFilteredData.map((row) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.2s' }}>
                        <td style={tdStyle}><strong>{row.fiber}</strong></td>
                        <td style={tdStyle}>{row.yarn}</td>
                        <td style={tdStyle}>{row.count}</td>
                        <td style={tdStyle}>{row.blend}</td>
                        <td style={tdStyle}>{row.year}</td>
                        <td style={tdStyle}>{row.month}</td>
                        <td style={{ ...tdStyle, fontWeight: '700', color: '#16a34a', fontSize: '15px' }}>{row.price}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '15px' }}>
                        No records match the exact filter combination.
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

const filterBoxStyle: React.CSSProperties = { flex: '1 1 125px', minWidth: '125px' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '5px', textTransform: 'uppercase' };
const selectStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '13px', backgroundColor: '#ffffff', color: '#0f172a', cursor: 'pointer' };
const thStyle: React.CSSProperties = { padding: '12px 10px', color: '#475569', fontWeight: '700', textTransform: 'uppercase', fontSize: '12px' };
const tdStyle: React.CSSProperties = { padding: '12px 10px', color: '#0f172a' };
