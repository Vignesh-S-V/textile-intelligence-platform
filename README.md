# Textile Intelligence Platform — Official Yarn Price Intelligence Dashboard

A yarn-price intelligence dashboard built around **verified official Government of India textile-price publications**. The platform ingests published yarn-price PDFs/data from official sources, normalizes them into a common dataset, provides dynamic filtering and monthly price analytics, and adds a transparent forecasting layer.

## Forecasting Method | Price Data Sources | Current Implementation

**Forecasting Method:** The forecast engine aggregates the filtered verified records into monthly average prices and compares multiple time-series approaches — **Adaptive Holt, Damped Trend, Linear Trend, Drift, Recent Mean, Seasonal Naive, and Seasonal-Trend Ensemble** when sufficient history exists. Models are evaluated using **rolling backtesting on the exact active filter selection**, and the model with the lowest backtested MAPE is selected for the forecast. The dashboard reports the resulting backtested accuracy instead of hard-coding or fabricating a 95% accuracy value. The forecast chart is intentionally limited to **current-year actual monthly values + future forecast values**.

**Price Data Sources:** The scraper uses official publications from the **Office of the Textile Commissioner (TXC)**, **National Textile Corporation (NTC)**, and **National Handloom Development Corporation (NHDC)**. TXC provides the historical cotton-yarn price series; NTC provides official yarn price lists; NHDC provides official cotton hank-yarn rates. Source URL and source identity are retained with the generated records for traceability.

**Current Implementation:** The project currently includes scheduled official-data ingestion, PDF table extraction, record normalization, duplicate removal, dynamic State/District/Centre/Fiber/Yarn Type/Spinning/Count/Blend/Yarn Name/Year/Month filters, monthly average-price analytics, historical price tables, and the current-year + future forecast chart. The forecast automatically recalculates when the active filters change.

## Official data pipeline

1. GitHub Actions runs the official-data scraper on schedule or manual workflow dispatch.
2. `scripts/scrape_yarn.py` downloads official TXC, NTC and NHDC publications and extracts price records.
3. Records are normalized into `data/yarn.json` with date, price, yarn/fiber attributes and source metadata.
4. Duplicate records are removed and the generated dataset is committed back to GitHub.
5. Vercel serves the dataset through `/api/yarn`.
6. The frontend applies filters and calculates monthly averages.
7. `forecast.js` performs rolling backtesting, selects the best-performing available model, and displays the current-year actual + future forecast.

## Forecast accuracy note

A **95% validation target** is used as a quality threshold, not as a guaranteed result. Forecast accuracy depends on the selected yarn, count, blend, region/centre and the amount of verified historical data available. If a filtered series does not validate above 95%, the dashboard reports the measured accuracy rather than changing the value artificially. Forecasting is an estimate and should not be treated as a guaranteed future market price.

## Main files

- `index.html` — frontend UI, filters, historical table and historical monthly chart.
- `forecast.js` — isolated forecasting UI and time-series model selection/backtesting logic.
- `scripts/scrape_yarn.py` — scheduled official-source ingestion and PDF parsing.
- `data/yarn.json` — generated normalized verified yarn-price dataset.
- `api/yarn.js` — Vercel API endpoint serving the generated dataset.
- `.github/workflows/update-yarn-data.yml` — automated official-data refresh workflow.

## Official source references

- Textile Commissioner (TXC): `https://www.txcindia.gov.in/html/ecomicsection/Cotton%20Yarn%20Prices.pdf`
- National Textile Corporation (NTC) Southern Region archive: `https://www.ntcltd.org/SRO_oldRecords.aspx`
- National Textile Corporation (NTC) Western Region archive: `https://www.ntcltd.org/WRO_oldRecords.aspx`
- National Handloom Development Corporation (NHDC) yarn rates: `https://nhdc.org.in/upload/YarnRate-English.pdf`

## Local testing

```bash
npm install
npm run dev
```

The production deployment is designed for GitHub + Vercel, with the generated dataset refreshed by GitHub Actions rather than scraping during each browser request.
