import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET() {
  try {
    const targetUrl = 'https://www.fibre2fashion.com/yarn-price/'; 

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch from web: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const uniqueMap = new Map();
    let idCounter = 1;

    // Target all tables and price listing rows across the webpage
    $('table tr, .price-table tr, tbody tr').each((_, element) => {
      const cols = $(element).find('td');
      
      // Ensure row has enough columns for yarn metrics
      if (cols.length >= 3) {
        const countVal = $(cols[0]).text().trim();
        const yarnNameVal = $(cols[1]).text().trim();
        const priceVal = $(cols[2]).text().trim();
        
        // Dynamically extract location text from remaining columns if present
        let rawLocation = '';
        for (let i = 3; i < cols.length; i++) {
          const text = $(cols[i]).text().trim();
          if (text) {
            rawLocation += ' ' + text;
          }
        }
        rawLocation = rawLocation.trim() || yarnNameVal; // Fallback for location parsing

        // Filter out headers, empty rows, or invalid pricing formats
        if (countVal && priceVal && priceVal.toLowerCase() !== 'price' && !priceVal.includes('₹₹')) {
          const lowerYarn = yarnNameVal.toLowerCase();
          
          // 1. Comprehensive Fiber Type Detection
          let fiber = 'Cotton';
          if (lowerYarn.includes('poly') || lowerYarn.includes('polyester')) fiber = 'Polyester';
          else if (lowerYarn.includes('viscose') || lowerYarn.includes('rayon')) fiber = 'Viscose';
          else if (lowerYarn.includes('acrylic')) fiber = 'Acrylic';
          else if (lowerYarn.includes('nylon')) fiber = 'Nylon';
          else if (lowerYarn.includes('silk')) fiber = 'Silk';
          else if (lowerYarn.includes('wool')) fiber = 'Wool';
          else if (lowerYarn.includes('blend') || lowerYarn.includes('pc') || lowerYarn.includes('pv')) fiber = 'Blended';

          // 2. Comprehensive Spinning / Yarn Type Detection
          let spinning = 'Ring Spun';
          if (lowerYarn.includes('open end') || lowerYarn.includes('oe') || lowerYarn.includes('rotor')) spinning = 'Open End';
          else if (lowerYarn.includes('compact')) spinning = 'Compact Spun';
          else if (lowerYarn.includes('carded')) spinning = 'Carded';
          else if (lowerYarn.includes('combed')) spinning = 'Combed';
          else if (lowerYarn.includes('slub')) spinning = 'Slub';
          else if (lowerYarn.includes('air jet') || lowerYarn.includes('mvs')) spinning = 'Air Jet';

          // 3. Comprehensive Blend Detection
          let blend = `100% ${fiber}`;
          if (lowerYarn.includes('pc') || lowerYarn.includes('poly cotton')) blend = 'Poly-Cotton (PC)';
          else if (lowerYarn.includes('pv') || lowerYarn.includes('poly viscose')) blend = 'Poly-Viscose (PV)';
          else if (lowerYarn.includes('cotton/')) blend = 'Cotton Blended';

          // 4. Comprehensive State & District Mapping Across All Regions
          let district = 'Tiruppur';
          let state = 'Tamil Nadu';
          const locLower = `${rawLocation} ${lowerYarn}`.toLowerCase();

          if (locLower.includes('surat')) { district = 'Surat'; state = 'Gujarat'; }
          else if (locLower.includes('coimbatore')) { district = 'Coimbatore'; state = 'Tamil Nadu'; }
          else if (locLower.includes('ahmedabad')) { district = 'Ahmedabad'; state = 'Gujarat'; }
          else if (locLower.includes('ludhiana')) { district = 'Ludhiana'; state = 'Punjab'; }
          else if (locLower.includes('erode')) { district = 'Erode'; state = 'Tamil Nadu'; }
          else if (locLower.includes('panipat')) { district = 'Panipat'; state = 'Haryana'; }
          else if (locLower.includes('bhiwandi') || locLower.includes('mumbai')) { district = 'Bhiwandi'; state = 'Maharashtra'; }
          else if (locLower.includes('ichalkaranji')) { district = 'Ichalkaranji'; state = 'Maharashtra'; }
          else if (locLower.includes('bhilwara')) { district = 'Bhulwara'; state = 'Rajasthan'; }
          else if (locLower.includes('tirunelveli')) { district = 'Tirunelveli'; state = 'Tamil Nadu'; }
          else if (locLower.includes('salem')) { district = 'Salem'; state = 'Tamil Nadu'; }
          else if (locLower.includes('kolkata')) { district = 'Kolkata'; state.value = 'West Bengal'; }
          else if (locLower.includes('delhi')) { district = 'Delhi'; state = 'Delhi'; }

          const cleanPrice = priceVal.includes('₹') ? priceVal : `₹ ${priceVal}`;
          
          // Unique composite key to capture all variations without duplicates
          const uniqueKey = `${yarnNameVal}-${countVal}-${district}-${cleanPrice}`.toLowerCase();

          if (!uniqueMap.has(uniqueKey)) {
            uniqueMap.set(uniqueKey, {
              id: idCounter++,
              state: state,
              district: district,
              fiber: fiber,
              yarnType: spinning,
              count: countVal,
              spinning: spinning,
              blend: blend,
              yarn: yarnNameVal,
              year: '2026',
              month: 'Current',
              price: cleanPrice
            });
          }
        }
      }
    });

    const scrapedMarketData = Array.from(uniqueMap.values());
    return NextResponse.json(scrapedMarketData);

  } catch (error: any) {
    console.error("Web scraping error:", error);
    return NextResponse.json(
      { error: 'Failed to scrape comprehensive live market prices.' }, 
      { status: 500 }
    );
  }
}
