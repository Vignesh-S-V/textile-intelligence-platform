import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL;

export async function GET(_request: NextRequest) {
  if (!BACKEND_URL) {
    return NextResponse.json(
      {
        error: 'BACKEND_API_URL is not configured.',
        states: [], districts: [], fibers: [], counts: [],
        spinning_types: [], blends: [], yarns: [], markets: [],
        years: [], months: [],
      },
      { status: 503 }
    );
  }

  try {
    const upstream = await fetch(`${BACKEND_URL}/api/filter-metadata`, {
      next: { revalidate: 60 },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Backend returned ${upstream.status}` },
        { status: 502 }
      );
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('filter-metadata proxy error:', error);
    return NextResponse.json(
      { error: 'Backend unavailable.' },
      { status: 502 }
    );
  }
}
