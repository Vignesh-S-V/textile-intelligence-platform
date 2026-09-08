import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Inga unga SQL Server / SAP Business One database view-la irundhu data-va fetch pannanum.
    // Example format matching your exact historical requirements:
    const realDatabaseRecords = [
      {
        id: 1,
        state: 'Tamil Nadu',
        district: 'Tiruppur',
        fiber: 'Cotton',
        yarnType: 'Single',
        count: '30s',
        spinning: 'Ring Spun',
        blend: '100% Cotton',
        yarn: 'Cotton 30s Combed',
        year: '2025',
        month: 'Jan',
        price: '₹ 265'
      },
      {
        id: 2,
        state: 'Tamil Nadu',
        district: 'Coimbatore',
        fiber: 'Cotton',
        yarnType: 'Double/Plied',
        count: '40s',
        spinning: 'Compact Spun',
        blend: '100% Cotton',
        yarn: 'Cotton 40s Karded',
        year: '2025',
        month: 'Feb',
        price: '₹ 255'
      },
      {
        id: 3,
        state: 'Gujarat',
        district: 'Surat',
        fiber: 'Polyester',
        yarnType: 'Slub',
        count: '20s',
        spinning: 'Open End',
        blend: '100% Polyester',
        yarn: 'Polyester 150D',
        year: '2024',
        month: 'Mar',
        price: '₹ 110'
      }
    ];

    return NextResponse.json(realDatabaseRecords);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch database records' }, { status: 500 });
  }
}
