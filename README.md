# Textile Intelligence Platform

Production-oriented enterprise analytics foundation for textile manufacturing, yarn-price intelligence and market analysis.

## What is included

- **Executive Dashboard** — yarn record count, average/latest prices, market indication, trend and automated insights.
- **Yarn Intelligence** — normalized State → District/Region → Centre/Region → Fiber → Yarn Category → Yarn Type → Count → Spinning → Blend → Yarn Name filters, historical table, monthly analytics and current market indications.
- **Forecasting** — Adaptive Holt, Damped Trend, Linear Trend, Drift, Recent Mean and Seasonal Naive candidates with rolling backtesting. A current market report can be used only as a clearly labelled market anchor when a market is explicitly selected.
- **Operations Control** — data contract and UI for employee/headcount, production, inventory and sales-vs-BOM metrics. No operational value is fabricated when an ERP/MES/WMS connector is absent.
- **Analytics Studio** — source, fiber and product mix plus automated insights and CSV export.
- **Data Quality** — missing-value, duplicate and lineage diagnostics.
- **Report Center** — filtered CSV, JSON analytics snapshot and browser print/PDF workflow.
- **Automated ingestion** — existing GitHub Actions scrapers for official yarn publications and separate market-report ingestion are preserved.

## Architecture

```text
Browser
  │
  ├── index.html        Application shell / views
  ├── styles.css        Enterprise responsive UI system
  ├── app.js            Data loading, filters, analytics, exports, operations import
  └── forecast.js       Forecast models + rolling backtest
          │
          ▼
      Express server
          │
          ├── /api/yarn        data/yarn.json
          ├── /api/live-yarn   data/live_yarn.json
          ├── /api/operations  data/operations.json
          └── /health

GitHub Actions
  ├── official source ingestion → data/yarn.json
  └── market report ingestion   → data/live_yarn.json

Optional future connectors
  └── ERP / MES / WMS → normalized operations snapshot
```

## Data governance

The platform keeps **official source records** separate from **market indicators**. TXC, NTC and NHDC observations remain source-traceable. Public trade/news observations are classified as market indicators and are never silently inserted into the official historical series.

Missing observations are not copied forward or interpolated. If a selected series does not have enough verified monthly history, forecasting is withheld.

NTC archive records may identify a Southern/Western **source region** rather than a state/district. The application therefore does not invent a state mapping.

## Operations data contract

`data/operations.json` is intentionally empty in the repository until a real operational source is connected. The browser also supports a session-only CSV import.

Recommended normalized fields:

- Employees: `employee_id,status,department,production_flag`
- Production: `date,product,quantity,unit,line`
- Inventory: `sku,category,inventory_quantity,unit,value`
- Sales/BOM: `order_id,product,demand_qty,bom_stock_qty`

For a production ERP integration, replace this snapshot with a scheduled ETL job that validates the source, normalizes units and writes only approved fields.

## Local development

Requirements: Node.js 20+ and Python 3.10+ for the ingestion scripts.

```bash
git clone https://github.com/Vignesh-S-V/textile-intelligence-platform.git
cd textile-intelligence-platform
npm install
npm run dev
```

Open `http://localhost:10000`.

For production-style execution:

```bash
npm start
```

## Deployment

### Render

The repository already contains `render.yaml`. Use:

- Build command: `npm install`
- Start command: `npm start`
- Environment: Node

### Vercel

The static application and `api/prices.js` can continue to be served by Vercel. Configure `DATA_GOV_API_KEY` as a Vercel environment variable if the government cotton API endpoint is used. Never commit the API key.

The Express server is useful for Render/self-hosted deployments; Vercel serverless functions should be kept under `api/`.

## Automated data refresh

The existing `.github/workflows/` jobs can be run manually or on schedule. The ingestion scripts are responsible for downloading/parsing source publications and writing normalized JSON. Review generated diffs before promoting a source parser change.

## Main files

| File | Responsibility |
|---|---|
| `index.html` | Application shell and enterprise views |
| `styles.css` | Responsive design system |
| `app.js` | Data layer, filtering, analytics, exports, operations import |
| `forecast.js` | Time-series models and validation |
| `server.js` | Render/self-hosted API server |
| `api/prices.js` | Vercel government cotton API function |
| `data/yarn.json` | Generated official yarn history |
| `data/live_yarn.json` | Generated market-report indicators |
| `data/operations.json` | Optional operational snapshot contract |
| `scripts/` | Source ingestion and normalization |
| `.github/workflows/` | Scheduled ingestion workflows |

## Production hardening roadmap

1. Connect ERP/MES/WMS through a server-side ETL/API layer; do not expose credentials in the browser.
2. Add database persistence (PostgreSQL or an existing enterprise warehouse) for operational facts and dimensions.
3. Add authentication/authorization and role-based navigation for executive, procurement, production and finance users.
4. Add automated schema validation and anomaly tests to CI before data commits.
5. Add observability for scraper failures, stale source dates and API latency.
6. Add unit/integration tests for normalization, deduplication and forecasting backtests.

## Official sources currently used by the platform

- Textile Commissioner: https://www.txcindia.gov.in/html/ecomicsection/Cotton%20Yarn%20Prices.pdf
- NTC Southern Region archive: https://www.ntcltd.org/SRO_oldRecords.aspx
- NTC Western Region archive: https://www.ntcltd.org/WRO_oldRecords.aspx
- NHDC yarn rates: https://nhdc.org.in/yarnrate.aspx

## Important

This platform is an analytics system, not a trading terminal. Current market-report values are indicators from published reports. Forecasts are statistical estimates and must be reviewed with procurement, production and commercial context before business decisions are made.
