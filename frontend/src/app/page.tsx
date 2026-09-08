"use client";

import React, { useState } from 'react';

export default function Home() {
  // Filter States (Pazhaya Filters + Pudhu 5 Filters)
  const [filters, setFilters] = useState({
    state: '',
    district: '',
    yarn: '',
    year: '',
    month: '',
    fiber: '',
    yarnType: '',
    count: '',
    spinning: '',
    blend: ''
  });

  // Handle Dropdown Change (retains existing filters)
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Reset All Filters
  const clearAllFilters = () => {
    setFilters({
      state: '',
      district: '',
      yarn: '',
      year: '',
      month: '',
      fiber: '',
      yarnType: '',
      count: '',
      spinning: '',
      blend: ''
    });
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

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* 2. FILTERS BAR (Side-by-Side Horizontal Row) */}
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #cbd5e1', marginBottom: '25px' }}>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px' }}>
            
            {/* State Filter */}
            <div style={{ flex: '1 1 130px', minWidth: '130px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '5px', textTransform: 'uppercase' }}>
                State
              </label>
              <select 
                name="state" 
                value={filters.state} 
                onChange={handleFilterChange} 
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '13px', backgroundColor: '#ffffff', color: '#0f172a', cursor: 'pointer' }}
              >
                <option value="">All States</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Gujarat">Gujarat</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Punjab">Punjab</option>
              </select>
            </div>

            {/* District Filter */}
            <div style={{ flex: '1 1 130px', minWidth: '130px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '5px', textTransform: 'uppercase' }}>
                District
              </label>
              <select 
                name="district" 
                value={filters.district} 
                onChange={handleFilterChange} 
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '13px', backgroundColor: '#ffffff', color: '#0f172a', cursor: 'pointer' }}
              >
                <option value="">All Districts</option>
                <option value="Tiruppur">Tiruppur</option>
                <option value="Coimbatore">Coimbatore</option>
                <option value="Erode">Erode</option>
                <option value="Surat">Surat</option>
                <option value="Ahmedabad">Ahmedabad</option>
              </select>
            </div>

            {/* Fiber Filter (NEW) */}
            <div style={{ flex: '1 1 130px', minWidth: '130px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '5px', textTransform: 'uppercase' }}>
                Fiber
              </label>
              <select 
                name="fiber" 
                value={filters.fiber} 
                onChange={handleFilterChange} 
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '13px', backgroundColor: '#ffffff', color: '#0f172a', cursor: 'pointer' }}
              >
                <option value="">All Fibers</option>
                <option value="Cotton">Cotton</option>
                <option value="Polyester">Polyester</option>
                <option value="Viscose">Viscose</option>
                <option value="Acrylic">Acrylic</option>
                <option value="Linen">Linen</option>
                <option value="Bamboo">Bamboo</option>
              </select>
            </div>

            {/* Yarn Type Filter (NEW) */}
            <div style={{ flex: '1 1 130px', minWidth: '130px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '5px', textTransform: 'uppercase' }}>
                Yarn Type
              </label>
              <select 
                name="yarnType" 
                value={filters.yarnType} 
                onChange={handleFilterChange} 
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '13px', backgroundColor: '#ffffff', color: '#0f172a', cursor: 'pointer' }}
              >
                <option value="">All Yarn Types</option>
                <option value="Single">Single</option>
                <option value="Double/Plied">Double / Plied</option>
                <option value="Slub">Slub</option>
                <option value="Melange">Melange</option>
                <option value="Lycra Core">Lycra Core</option>
              </select>
            </div>

            {/* Count Filter (NEW) */}
            <div style={{ flex: '1 1 110px', minWidth: '110px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '5px', textTransform: 'uppercase' }}>
                Count
              </label>
              <select 
                name="count" 
                value={filters.count} 
                onChange={handleFilterChange} 
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '13px', backgroundColor: '#ffffff', color: '#0f172a', cursor: 'pointer' }}
              >
                <option value="">All Counts</option>
                <option value="20s">20s</option>
                <option value="30s">30s</option>
                <option value="40s">40s</option>
                <option value="60s">60s</option>
                <option value="80s">80s</option>
                <option value="100s">100s</option>
              </select>
            </div>

            {/* Spinning Filter (NEW) */}
            <div style={{ flex: '1 1 130px', minWidth: '130px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '5px', textTransform: 'uppercase' }}>
                Spinning
              </label>
              <select 
                name="spinning" 
                value={filters.spinning} 
                onChange={handleFilterChange} 
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '13px', backgroundColor: '#ffffff', color: '#0f172a', cursor: 'pointer' }}
              >
                <option value="">All Spinning Types</option>
                <option value="Ring Spun">Ring Spun</option>
                <option value="Open End">Open End (OE)</option>
                <option value="Compact Spun">Compact Spun</option>
                <option value="Vortex/Airjet">Vortex / Airjet</option>
              </select>
            </div>

            {/* Blend Filter (NEW) */}
            <div style={{ flex: '1 1 130px', minWidth: '130px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '5px', textTransform: 'uppercase' }}>
                Blend
              </label>
              <select 
                name="blend" 
                value={filters.blend} 
                onChange={handleFilterChange} 
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '13px', backgroundColor: '#ffffff', color: '#0f172a', cursor: 'pointer' }}
              >
                <option value="">All Blends</option>
                <option value="100% Cotton">100% Cotton</option>
                <option value="100% Polyester">100% Polyester</option>
                <option value="67/33 PC">67/33 PC</option>
                <option value="50/50 PC">50/50 PC</option>
                <option value="80/20 PV">80/20 PV</option>
              </select>
            </div>

            {/* Yarn Name Filter */}
            <div style={{ flex: '1 1 130px', minWidth: '130px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '5px', textTransform: 'uppercase' }}>
                Yarn Name
              </label>
              <select 
                name="yarn" 
                value={filters.yarn} 
                onChange={handleFilterChange} 
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '13px', backgroundColor: '#ffffff', color: '#0f172a', cursor: 'pointer' }}
              >
                <option value="">All Yarns</option>
                <option value="Cotton 30s Combed">Cotton 30s Combed</option>
                <option value="Cotton 40s Karded">Cotton 40s Karded</option>
                <option value="Polyester 150D">Polyester 150D</option>
                <option value="Viscose 30s">Viscose 30s</option>
              </select>
            </div>

            {/* Year Filter */}
            <div style={{ flex: '1 1 100px', minWidth: '100px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '5px', textTransform: 'uppercase' }}>
                Year
              </label>
              <select 
                name="year" 
                value={filters.year} 
                onChange={handleFilterChange} 
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '13px', backgroundColor: '#ffffff', color: '#0f172a', cursor: 'pointer' }}
              >
                <option value="">All Years</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
            </div>

            {/* Month Filter */}
            <div style={{ flex: '1 1 100px', minWidth: '100px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '5px', textTransform: 'uppercase' }}>
                Month
              </label>
              <select 
                name="month" 
                value={filters.month} 
                onChange={handleFilterChange} 
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '13px', backgroundColor: '#ffffff', color: '#0f172a', cursor: 'pointer' }}
              >
                <option value="">All Months</option>
                <option value="Jan">January</option>
                <option value="Feb">February</option>
                <option value="Mar">March</option>
                <option value="Apr">April</option>
                <option value="May">May</option>
                <option value="Jun">June</option>
                <option value="Jul">July</option>
                <option value="Aug">August</option>
                <option value="Sep">September</option>
                <option value="Oct">October</option>
                <option value="Nov">November</option>
                <option value="Dec">December</option>
              </select>
            </div>

            {/* Clear All Button */}
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
