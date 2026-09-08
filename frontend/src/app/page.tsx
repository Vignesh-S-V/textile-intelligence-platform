"use "use client";

import React, { useState, useMemo } from 'react';

// Sample Master Textile Dataset
const SAMPLE_DATA = [
  { id: 1, state: 'Tamil Nadu', district: 'Tiruppur', fiber: 'Cotton', yarnType: 'Single', count: '30s', spinning: 'Ring Spun', blend: '100% Cotton', yarn: 'Cotton 30s Combed', year: '2025', month: 'Jan' },
  { id: 2, state: 'Tamil Nadu', district: 'Coimbatore', fiber: 'Cotton', yarnType: 'Double/Plied', count: '40s', spinning: 'Compact Spun', blend: '100% Cotton', yarn: 'Cotton 40s Karded', year: '2025', month: 'Feb' },
  { id: 3, state: 'Gujarat', district: 'Surat', fiber: 'Polyester', yarnType: 'Slub', count: '20s', spinning: 'Open End', blend: '100% Polyester', yarn: 'Polyester 150D', year: '2024', month: 'Mar' },
  { id: 4, state: 'Tamil Nadu', district: 'Erode', fiber: 'Viscose', yarnType: 'Melange', count: '30s', spinning: 'Vortex/Airjet', blend: '80/20 PV', yarn: 'Viscose 30s', year: '2026', month: 'Jan' },
  { id: 5, state: 'Punjab', district: 'Ludhiana', fiber: 'Cotton', yarnType: 'Lycra Core', count: '20s', spinning: 'Ring Spun', blend: '67/33 PC', yarn: 'Cotton PC 20s', year: '2025', month: 'Apr' },
];

export default function DynamicFilterHome() {
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

  // 1. Filter the entire dataset based on current selections (except the current field itself)
  const getFilteredData = (excludeKey?: string) => {
    return SAMPLE_DATA.filter((item) => {
      return Object.keys(filters).every((key) => {
        if (key === excludeKey) return true; // Exclude current field from filtering its own options
        const filterVal = filters[key as keyof typeof filters];
        return !filterVal || item[key as keyof typeof item] === filterVal;
      });
    });
  };

  // 2. Helper function to get unique dynamic dropdown options
  const getDynamicOptions = (key: string) => {
    const matchingData = getFilteredData(key);
    const options = Array.from(new Set(matchingData.map((item) => item[key as keyof typeof item])));
    return options.sort();
  };

  // Dynamic Options for each filter
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
    setFilters((prev) => ({ ...prev, [name]: value }));
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

  // Final Data to display in sheet/table
  const finalFilteredData = getFilteredData();

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', padding: '20px', color: '#0f172a' }}>
      
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '25px', paddingBottom: '20px', borderBottom: '2px solid #e2e8f0' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0' }}>
          TEXTILE INTELLIGENCE PLATFORM
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1.5px', margin: 0 }}>
          Cascading / Dynamic Dependent Filters
        </p>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Dynamic Filters Bar */}
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #cbd5e1', marginBottom: '25px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px' }}>
            
            {/* Fiber Filter */}
            <div style={{ flex: '1 1 130px', minWidth: '130px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '5px', textTransform: 'uppercase' }}>
                Fiber ({fiberOptions.length})
              </label>
              <select name="fiber" value={filters.fiber} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All Fibers</option>
                {fiberOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {/* Yarn Type Filter */}
            <div style={{ flex: '1 1 130px', minWidth: '130px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '5px', textTransform: 'uppercase' }}>
                Yarn Type ({yarnTypeOptions.length})
              </label>
              <select name="yarnType" value={filters.yarnType} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All Yarn Types</option>
                {yarnTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {/* Count Filter */}
            <div style={{ flex: '1 1 110px', minWidth: '110px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '5px', textTransform: 'uppercase' }}>
                Count ({countOptions.length})
              </label>
              <select name="count" value={filters.count} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All Counts</option>
                {countOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {/* Spinning Filter */}
            <div style={{ flex: '1 1 130px', minWidth: '130px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '5px', textTransform: 'uppercase' }}>
                Spinning ({spinningOptions.length})
              </label>
              <select name="spinning" value={filters.spinning} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All Spinning</option>
                {spinningOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {/* Blend Filter */}
            <div style={{ flex: '1 1 130px', minWidth: '130px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '5px', textTransform: 'uppercase' }}>
                Blend ({blendOptions.length})
              </label>
              <select name="blend" value={filters.blend} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All Blends</option>
                {blendOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {/* State Filter */}
            <div style={{ flex: '1 1 130px', minWidth: '130px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '5px', textTransform: 'uppercase' }}>
                State ({stateOptions.length})
              </label>
              <select name="state" value={filters.state} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All States</option>
                {stateOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {/* District Filter */}
            <div style={{ flex: '1 1 130px', minWidth: '130px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '5px', textTransform: 'uppercase' }}>
                District ({districtOptions.length})
              </label>
              <select name="district" value={filters.district} onChange={handleFilterChange} style={selectStyle}>
                <option value="">All Districts</option>
                {districtOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {/* Clear Button */}
            <div style={{ marginLeft: 'auto' }}>
              <button onClick={clearAllFilters} style={{ backgroundColor: '#ef4444', color: '#ffffff', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', height: '36px' }}>
                Clear All
              </button>
            </div>

          </div>
        </div>

        {/* Results Area */}
        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 15px 0' }}>
            Filtered Results ({finalFilteredData.length} Items Found)
          </h2>
          <pre style={{ backgroundColor: '#f1f5f9', padding: '15px', borderRadius: '6px', fontSize: '13px', overflowX: 'auto' }}>
            {JSON.stringify(finalFilteredData, null, 2)}
          </pre>
        </div>

      </div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid #94a3b8',
  fontSize: '13px',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  cursor: 'pointer'
};
