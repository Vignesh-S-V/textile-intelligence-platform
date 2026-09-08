import { NextRequest, NextResponse } from 'next/server';

// Proxies to the real backend (FastAPI + Postgres), which only returns
// records that actually exist in the database. This route must never
// invent, guess, or default any field itself.
const BACKEND_URL = process.env.BACKEND_API_URL;

export async function GET(request: NextRequest) {
  if (!BACKEND_URL) {
    return NextResponse.json(
      { error: 'BACKEND_API_URL is not configured.', results: [], total: 0 },
      { status: 503 }
    );
  }

  const search = request.nextUrl.search;

  try {
    const upstream = await fetch(`${BACKEND_URL}/api/market-prices${search}`, {
      next: { revalidate: 60 },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Backend returned ${upstream.status}`, results: [], total: 0 },
        { status: 502 }
      );
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('market-prices proxy error:', error);
    return NextResponse.json(
      { error: 'Backend unavailable.', results: [], total: 0 },
      { status: 502 }
    );
  }
}
