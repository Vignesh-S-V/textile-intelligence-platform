"use client"; // Next.js-la interactive filters use panna idhu mukkiyam

import React, { useState } from 'react';

export default function Home() {
  // Filters-kanda State management
  const [filters, setFilters] = useState({
    state: '',
    district: '',
    yarn: '',
    year: '',
    month: ''
  });

  // Oru filter maathumbodhu matha filters pogaama irukka intha function
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Ellaa filters-um reset panna
  const clearAllFilters = () => {
    setFilters({ state: '', district: '', yarn: '', year: '', month: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      
      {/* HEADER SECTION (Top Center) */}
      <header className="bg-white shadow-sm py-6 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            TEXTILE INTELLIGENCE PLATFORM
          </h1>
          <p className="mt-2 text-sm text-gray-500 uppercase tracking-widest font-semibold">
            Real-time Yarn • Loom • Fabric • Market Intelligence
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* FILTERS SECTION */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="flex flex-wrap items-end gap-4">
            
            {/* State Filter */}
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">State</label>
              <select name="state" value={filters.state} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                <option value="">All States</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Gujarat">Gujarat</option>
                <option value="Maharashtra">Maharashtra</option>
              </select>
            </div>

            {/* District Filter */}
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">District</label>
              <select name="district" value={filters.district} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                <option value="">All Districts</option>
                <option value="Tiruppur">Tiruppur</option>
                <option value="Coimbatore">Coimbatore</option>
                <option value="Erode">Erode</option>
                <option value="Surat">Surat</option>
              </select>
            </div>

            {/* Yarn Name Filter */}
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Yarn Name</label>
              <select name="yarn" value={filters.yarn} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                <option value="">All Yarns</option>
                <option value="Cotton 30s">Cotton 30s</option>
                <option value="Cotton 40s">Cotton 40s</option>
                <option value="Polyester">Polyester</option>
                <option value="Viscose">Viscose</option>
              </select>
            </div>

            {/* Year Filter */}
            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Year</label>
              <select name="year" value={filters.year} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                <option value="">All Years</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
            </div>

            {/* Month Filter */}
            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Month</label>
              <select name="month" value={filters.month} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
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
                className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-bold py-2 px-4 rounded text-sm transition-colors duration-200"
              >
                Clear All
              </button>
            </div>

          </div>
        </div>

        {/* DYNAMIC SHEET / DATA SECTION */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 min-h-[400px]">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Market Data Overview</h2>
          
          <div className="bg-blue-50 p-4 rounded border border-blue-100 mb-6">
            <h3 className="text-sm font-bold text-blue-800 uppercase mb-2">Current Applied Filters:</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(filters).map(([key, value]) => (
                value ? (
                  <span key={key} className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    {key}: {value}
                  </span>
                ) : null
              ))}
              {Object.values(filters).every(val => val === '') && (
                <span className="text-sm text-gray-500 italic">No filters applied. Showing all data.</span>
              )}
            </div>
          </div>

          {/* Placeholder for table/charts */}
          <div className="flex items-center justify-center h-48 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
            <p className="text-gray-400 text-center">
              Data Sheet will be loaded here based on the selected filters.<br/>
              (Connect your PowerBI/Database here later)
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}
