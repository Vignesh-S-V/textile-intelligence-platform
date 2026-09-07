'use client';
import React, { useEffect, useState } from 'react';

export default function ForecastCard({ yarnId }: { yarnId: number }) {
  const [forecast, setForecast] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/yarn-forecast/${yarnId}`)
      .then(res => res.json())
      .then(data => setForecast(data));
  }, [yarnId]);

  if (!forecast) return <div>Analyzing model data...</div>;

  if (forecast.status === 'unavailable' || forecast.status === 'error') {
    return (
      <div className="p-6 bg-gray-50 border text-gray-600">
        <h3 className="font-bold">6-Month Forecast</h3>
        <p className="mt-2">{forecast.message || "Forecast unavailable: Insufficient verified historical observations."}</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border border-gray-200">
      <h3 className="font-bold text-lg">6-Month Forecast</h3>
      <div className="mt-4">
        <p className="text-sm font-semibold uppercase text-gray-500">Direction</p>
        <p className={`text-2xl font-bold ${forecast.direction === 'UP' ? 'text-green-600' : forecast.direction === 'DOWN' ? 'text-red-600' : 'text-gray-600'}`}>
          {forecast.direction === 'UP' ? '▲' : forecast.direction === 'DOWN' ? '▼' : '▶'} {forecast.direction}
        </p>
      </div>
      
      {/* Disclaimer */}
      <div className="mt-6 text-xs text-gray-400 p-2 bg-gray-50 border border-gray-100">
        <strong>Disclaimer:</strong> {forecast.disclaimer}
      </div>
    </div>
  );
}
