"use client";

import React, { useState } from 'react';

export default function Home() {
  // Filter States
  const [filters, setFilters] = useState({
    state: '',
    district: '',
    yarn: '',
    year: '',
    month: ''
  });

  // Handle Dropdown Change (retains existing filters)
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Reset All Filters
  const clearAllFilters = () => {
    setFilters({ state: '', district: '', yarn: '', year: '', month: '' });
  };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', padding: '20px', color: '#0f172a' }}>
      
      {/* 1. HEADER SECTION (Dead Center) */}
      <div style={{ textAlign: 'center', marginBottom: '25px', paddingTop: '10px', paddingBottom: '20px', borderBottom: '2px solid #e2e8f0' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '0.5px' }}>
          TEXTILE INTELLIGENCE PLATFORM
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1.5px', margin: 0 }}>
          Real-time Yarn • Loom • Fabric • Market Intelligence
        </p>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* 2. FILTERS BAR (Side-by-Side Horizontal Row) */}
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #cbd5e1', marginBottom: '25px' }}>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '15px' }}>
            
            {/* State Filter */}
            <div style={{ flex: '1', minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px', textTransform: 'uppercase' }}>
                State
              </label>
              <select 
                name="state" 
                value={filters.state} 
                onChange={handleFilterChange} 
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '14px', backgroundColor: '#ffffff', color: '#0f172a', cursor: 'pointer' }}
              >
                <option value="">All States</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Gujarat">Gujarat</option>
                <option value="Maharashtra">Maharashtra</option>
              </select>
            </div>

            {/* District Filter */}
            <div style={{ flex: '1', minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px', textTransform: 'uppercase' }}>
                District
              </label>
              <select 
                name="district" 
                value={filters.district} 
                onChange={handleFilterChange} 
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '14px', backgroundColor: '#ffffff', color: '#0f172a', cursor: 'pointer' }}
              >
                <option value="">All Districts</option>
                <option value="Tiruppur">Tiruppur</option>
                <option value="Coimbatore">Coimbatore</option>
                <option value="Erode">Erode</option>
                <option value="Surat">Surat</option>
              </select>
            </div>

            {/* Yarn Name Filter */}
            <div style={{ flex: '1', minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px', textTransform: 'uppercase' }}>
                Yarn Name
              </label>
              <select 
                name="yarn" 
                value={filters.yarn} 
                onChange={handleFilterChange} 
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '14px', backgroundColor: '#ffffff', color: '#0f172a', cursor: 'pointer' }}
              >
                <option value="">All Yarns</option>
                <option value="Cotton 30s">Cotton 30s</option>
                <option value="Cotton 40s">Cotton 40s</option>
                <option value="Polyester">Polyester</option>
                <option value="Viscose">Viscose</option>
              </select>
            </div>

            {/* Year Filter */}
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px', textTransform: 'uppercase' }}>
                Year
              </label>
              <select 
                name="year" 
                value={filters.year} 
                onChange={handleFilterChange} 
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '14px', backgroundColor: '#ffffff', color: '#0f172a', cursor: 'pointer' }}
              >
                <option value="">All Years</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
            </div>

            {/* Month Filter */}
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px', textTransform: 'uppercase' }}>
                Month
              </label>
              <select 
                name="month" 
                value={filters.month} 
                onChange={handleFilterChange} 
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '14px', backgroundColor: '#ffffff', color: '#0f172a', cursor: 'pointer' }}
              >
                <option value="">All Months</option>
                <option value="Jan">January</option>
                <option value="Feb">February</option>
                <option value="Mar">March</option>
                <option value="Apr">April</option>
              </select>
            </div>

            {/* Clear All Button */}
            <div>
              <button 
                onClick={clearAllFilters} 
                style={{ backgroundColor: '#ef4444', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', height: '40px' }}
              >
                Clear All
              </button>
            </div>

          </div>
        </div>

        {/* 3. DYNAMIC SHEET AREA */}
        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #cbd5e1', minHeight: '350px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', marginTop: 0, marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
            Market Data Overview
          </h2>
          
          {/* Active Applied Filters Badge */}
          <div style={{ backgroundColor: '#eff6ff', padding: '14px', borderRadius: '8px', border: '1px solid #bfdbfe', marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#1d4ed8', textTransform: 'uppercase', marginBottom: '8px' }}>
              Current Active Filters:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {Object.entries(filters).map(([key, value]) => (
                value ? (
                  <span key={key} style={{ backgroundColor: '#2563eb', color: '#ffffff', fontSize: '12px', fontWeight: '700', padding: '4px 12px', borderRadius: '16px', textTransform: 'uppercase' }}>
                    {key}: {value}
                  </span>
                ) : null
              ))}
              {Object.values(filters).every(val => val === '') && (
                <span style={{ fontSize: '14px', color: '#64748b', fontStyle: 'italic' }}>No filters applied. Showing all data.</span>
              )}
            </div>
          </div>

          {/* Placeholder for Data Sheet / Table */}
          <div style={{ border: '2px dashed #cbd5e1', borderRadius: '8px', padding: '50px 20px', textAlign: 'center', backgroundColor: '#f8fafc', color: '#64748b', fontSize: '15px' }}>
            Interactive Sheet/Table will load here based on selected filters.
          </div>
        </div>

      </div>
    </div>
  );
}
