'use client';

import React, { useEffect, useState } from 'react';

interface PriceData {
  available: boolean;
  message?: string;
  data?: {
    price: number;
    unit: string;
    currency: string;
    effective_date: string;
    source: string;
    source_url: string;
    collected_at: string;
  } | null;
}

export default function CurrentPriceCard({ yarnId }: { yarnId: number }) {
  const [priceInfo, setPriceInfo] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPrice() {
      try {
        const res = await fetch(`/api/yarn-prices/current/${yarnId}`);
        const json = await res.json();
        setPriceInfo(json);
      } catch (error) {
        setPriceInfo({ available: false, message: "Source temporarily unavailable." });
      } finally {
        setLoading(false);
      }
    }
    fetchPrice();
  }, [yarnId]);

  if (loading) return <div className="p-6 border bg-white shadow-sm animate-pulse">Loading market data...</div>;

  if (!priceInfo?.available || !priceInfo.data) {
    return (
      <div className="p-6 border border-red-200 bg-red-50 text-red-800 shadow-sm">
        <h3 className="text-lg font-bold">Current Market Price</h3>
        <p className="mt-2 font-mono">{priceInfo?.message || "Data unavailable — no verified source found."}</p>
      </div>
    );
  }

  const { price, currency, unit, effective_date, source, source_url, collected_at } = priceInfo.data;

  return (
    <div className="p-6 border bg-white shadow-sm hover:shadow-md transition-shadow">
      <h3 className="text-sm text-gray-500 uppercase tracking-widest">Current Market Price</h3>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-4xl font-bold text-gray-900">{currency} {price.toFixed(2)}</span>
        <span className="text-lg text-gray-500">/ {unit}</span>
      </div>
      
      <div className="mt-8 pt-4 border-t border-gray-100 text-xs text-gray-400 flex flex-col gap-1">
        <p>Effective Date: {new Date(effective_date).toLocaleDateString()}</p>
        <p>Last Updated: {new Date(collected_at).toLocaleString()}</p>
        <p>Source: <a href={source_url} target="_blank" rel="noreferrer" className="underline hover:text-gray-700">{source}</a></p>
      </div>
    </div>
  );
}
