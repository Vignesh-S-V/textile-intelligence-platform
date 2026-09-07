import React from 'react';

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans">
      <header className="max-w-6xl mx-auto border-b border-neutral-800 pb-6 mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight">TEXTILE INTELLIGENCE PLATFORM</h1>
        <p className="mt-2 text-neutral-400 text-sm tracking-widest uppercase">
          Real-time Yarn • Loom • Fabric • Market Intelligence
        </p>
      </header>

      <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-lg">
          <h2 className="text-lg font-bold text-amber-500 mb-2">Live Market Status</h2>
          <p className="text-neutral-300 font-mono text-sm">
            Data unavailable — no verified source found.
          </p>
        </div>

        <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-lg">
          <h2 className="text-lg font-bold text-amber-500 mb-2">6-Month Price Forecast</h2>
          <p className="text-neutral-300 font-mono text-sm">
            Forecast unavailable: Insufficient verified historical observations.
          </p>
        </div>
      </section>
    </main>
  );
}
