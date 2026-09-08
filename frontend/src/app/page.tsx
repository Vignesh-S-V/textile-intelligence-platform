"use client";

import React, { useState, useMemo } from 'react';

// Master Dataset (Dynamic Filtering Logic intha Data-va base panni dhaan work aagum)
const MASTER_DATA = [
  { id: 1, state: 'Tamil Nadu', district: 'Tiruppur', fiber: 'Cotton', yarnType: 'Single', count: '30s', spinning: 'Ring Spun', blend: '100% Cotton', yarn: 'Cotton 30s Combed', year: '2025', month: 'Jan' },
  { id: 2, state: 'Tamil Nadu', district: 'Coimbatore', fiber: 'Cotton', yarnType: 'Double/Plied', count: '40s', spinning: 'Compact Spun', blend: '100% Cotton', yarn: 'Cotton 40s Karded', year: '2025', month: 'Feb' },
  { id: 3, state: 'Gujarat', district: 'Surat', fiber: 'Polyester', yarnType: 'Slub', count: '20s', spinning: 'Open End', blend: '100% Polyester', yarn: 'Polyester 150D', year: '2024', month: 'Mar' },
  { id: 4, state: 'Gujarat', district: 'Ahmedabad', fiber: 'Polyester', yarnType: 'Single', count: '40s', spinning: 'Ring Spun', blend: '100% Polyester', yarn: 'Polyester Micro', year: '2026', month: 'Feb' },
  { id: 5, state: 'Tamil Nadu', district: 'Erode', fiber: 'Viscose', yarnType: 'Melange', count: '30s', spinning: 'Vortex/Airjet', blend: '80/20 PV', yarn: 'Viscose 30s', year: '2026', month: 'Jan' },
  { id: 6, state: 'Punjab', district: 'Ludhiana', fiber: 'Cotton', yarnType: 'Lycra Core', count: '20s', spinning: 'Ring Spun', blend: '67/33 PC', yarn: 'Cotton PC 20s', year: '2025', month: 'Apr' },
];

export default function Home() {
  const [filters, setFilters] = useState({
    state: '',
    district: '',
    fiber: '',
    yarnType: '',
    count: '',
    spinning: '',
    blend: '',
    yarn: '',
    year: '',
    month: ''
  });

  // Dynamic Options Extractor Function
  const getDynamicOptions = (field: keyof typeof filters) => {
    const matchingData = MASTER_DATA.filter(item => {
      return Object.entries(filters).every(([key, val]) => {
        if (key === field || !val) return true; // Ignore current field or empty filters
        return item[key as keyof typeof item] === val;
      });
    });
    const uniqueVals = Array.from(new Set(matchingData.map(item => item[field])));
    return uniqueVals.sort();
  };

  // Dynamic Options for each Dropdown
  const stateOptions = useMemo(() => getDynamicOptions('state'), [filters]);
  const districtOptions = useMemo(() => getDynamicOptions('district'), [filters]);
  const fiberOptions = useMemo(() => getDynamicOptions('fiber'), [filters]);
  const yarnTypeOptions = useMemo(() => getDynamicOptions('yarnType'), [filters]);
  const countOptions = useMemo(() => getDynamicOptions('count'), [filters]);
  const spinningOptions = useMemo(() => getDynamicOptions('spinning'), [filters]);
  const blendOptions = useMemo(() => getDynamicOptions('blend'), [filters]);
  const yarnOptions = useMemo(() => getDynamicOptions('yarn'), [filters]);
  const yearOptions = useMemo(() => getDynamicOptions('year'), [filters]);
  const monthOptions = useMemo(() => getDynamicOptions('month'), [filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      state: '',
      district: '',
      fiber: '',
      yarnType: '',
      count: '',
      spinning: '',
      blend: '',
      yarn: '',
      year: '',
      month: ''
    });
  };

  // Filtered dataset for output table
  const finalFilteredData = MASTER_DATA.filter(item => {
    return Object.entries(filters).every(([key, val]) => {
      return !val || item[key as keyof typeof item] === val;
    });
  });

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', padding: '20px', color: '#0f172a' }}>
      
      {/* 1. HEADER SECTION (Center) */}
      <div style={{ textAlign: 'center', marginBottom: '25px', paddingTop: '10px', paddingBottom: '20px', borderBottom: '2px solid #e2e8f0' }}>
        <h1 style={{ fontSize: '30px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '0.5px' }}>
          TEXTILE INTELLIGENCE PLATFORM
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1.5px', margin: 0 }}>
          Real-time Yarn • Loom • Fabric • Market Intelligence
        </p>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* 2. DYNAMIC FILTERS BAR */}
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #cbd5e1', marginBottom: '25px' }}>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px' }}>
            
            {/* STATE */}
            <div style={filterBoxStyle}>
              <label style={labelStyle}>State</label>
              <select name="state" value={filters.state} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All States</option>
                {stateOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {/* DISTRICT */}
            <div style={filterBoxStyle}>
              <label style={labelStyle}>District</label>
              <select name="district" value={filters.district} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All Districts</option>
                {districtOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {/* FIBER */}
            <div style={filterBoxStyle}>
              <label style={labelStyle}>Fiber</label>
              <select name="fiber" value={filters.fiber} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All Fibers</option>
                {fiberOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {/* YARN TYPE */}
            <div style={filterBoxStyle}>
              <label style={labelStyle}>Yarn Type</label>
              <select name="yarnType" value={filters.yarnType} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All Yarn Types</option>
                {yarnTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {/* COUNT */}
            <div style={filterBoxStyle}>
              <label style={labelStyle}>Count</label>
              <select name="count" value={filters.count} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All Counts</option>
                {countOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {/* SPINNING */}
            <div style={filterBoxStyle}>
              <label style={labelStyle}>Spinning</label>
              <select name="spinning" value={filters.spinning} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All Spinning Types</option>
                {spinningOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {/* BLEND */}
            <div style={filterBoxStyle}>
              <label style={labelStyle}>Blend</label>
              <select name="blend" value={filters.blend} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All Blends</option>
                {blendOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {/* YARN NAME (Dynamic dependent on Fiber) */}
            <div style={filterBoxStyle}>
              <label style={labelStyle}>Yarn Name</label>
              <select name="yarn" value={filters.yarn} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All Yarns</option>
                {yarnOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {/* YEAR */}
            <div style={{ flex: '1 1 100px', minWidth: '100px' }}>
              <label style={labelStyle}>Year</label>
              <select name="year" value={filters.year} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All Years</option>
                {yearOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {/* MONTH */}
            <div style={{ flex: '1 1 100px', minWidth: '100px' }}>
              <label style={labelStyle}>Month</label>
              <select name="month" value={filters.month} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All Months</option>
                {monthOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {/* CLEAR ALL BUTTON */}
            <div style={{ marginLeft: 'auto' }}>
              <button 
                onClick={clearAllFilters} 
                style={{ backgroundColor: '#ef4444', color: '#ffffff', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', height: '36px' }}
              >
                Clear All
              </button>
            </div>

          </div>
        </div>

        {/* 3. ACTIVE DATA SHEET */}
        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #cbd5e1' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
            Market Data Overview ({finalFilteredData.length} Items Found)
          </h2>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={thStyle}>State</th>
                  <th style={thStyle}>District</th>
                  <th style={thStyle}>Fiber</th>
                  <th style={thStyle}>Yarn Name</th>
                  <th style={thStyle}>Count</th>
                  <th style={thStyle}>Blend</th>
                  <th style={thStyle}>Year</th>
                  <th style={thStyle}>Month</th>
                </tr>
              </thead>
              <tbody>
                {finalFilteredData.length > 0 ? (
                  finalFilteredData.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={tdStyle}>{row.state}</td>
                      <td style={tdStyle}>{row.district}</td>
                      <td style={tdStyle}><strong>{row.fiber}</strong></td>
                      <td style={tdStyle}>{row.yarn}</td>
                      <td style={tdStyle}>{row.count}</td>
                      <td style={tdStyle}>{row.blend}</td>
                      <td style={tdStyle}>{row.year}</td>
                      <td style={tdStyle}>{row.month}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                      No data matches the selected filter combination.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

const filterBoxStyle: React.CSSProperties = { flex: '1 1 125px', minWidth: '125px' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '5px', textTransform: 'uppercase' };
const selectStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '13px', backgroundColor: '#ffffff', color: '#0f172a', cursor: 'pointer' };
const thStyle: React.CSSProperties = { padding: '10px', color: '#334155', fontWeight: '700' };
const tdStyle: React.CSSProperties = { padding: '10px', color: '#0f172a' };
