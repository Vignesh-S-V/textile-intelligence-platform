import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL;

const EMPTY = {
  states: [], districts: [], fibers: [], counts: [],
  spinning_types: [], blends: [], yarns: [], markets: [],
  years: [], months: [],
};

export async function GET(_request: NextRequest) {
  // If backend URL not configured, return empty meta (not an error)
  // so the frontend shows the "no data yet" message instead of an error banner.
  if (!BACKEND_URL) {
    return NextResponse.json(EMPTY);
  }

  try {
    const upstream = await fetch(`${BACKEND_URL}/api/filter-metadata`, {
      next: { revalidate: 60 },
    });

    if (!upstream.ok) {
      // Backend reachable but returned an error — return empty silently
      return NextResponse.json(EMPTY);
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch {
    // Backend not reachable — return empty silently so UI shows "no data" not error
    return NextResponse.json(EMPTY);
  }
}
