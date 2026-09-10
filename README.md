# Textile Intelligence Platform

Focused enterprise application for textile yarn market intelligence and evidence-based price forecasting.

## Application scope

The production UI intentionally focuses on **Yarn Intelligence + Forecasting**. Non-essential Executive Dashboard, Operations, Analytics, Data Quality, Reports and Methodology navigation pages were removed to keep the workflow decision-focused.

## Forecasting pipeline

The forecast service is Python-backed and exposed through `POST /api/forecast`.

1. **Data preprocessing** — parse dates/prices, remove invalid/non-positive prices and aggregate source observations to a regular monthly series.
2. **Missing values** — only gaps between observed endpoints may be time-interpolated for models requiring a regular index; endpoints are never fabricated.
3. **Feature engineering** — lag 1/2/3/6/12, rolling means and standard deviations over 3/6/12 months, month seasonality (sin/cos) and trend.
4. **Candidate models** — SARIMAX, Holt Exponential Smoothing, Damped Trend, Seasonal Naive, Gradient Boosting with lag/rolling features, Ridge with lag/rolling features, Drift and Recent Mean.
5. **Validation** — rolling-origin out-of-sample validation. MAPE is the primary ranking metric and RMSE is the tie-breaker. No random train/test split is used for time series.
6. **Selection** — the lowest validated MAPE model is selected and retrained on the complete available history before producing the requested 3/6/12-month horizon.

The system does **not** promise an artificial 95%/99% accuracy. The displayed validation score is measured from historical holdouts. Future shocks cannot be known in advance.

### Textile-specific drivers

For a production textile forecast, price should ideally be modelled with exogenous drivers in addition to historical yarn price. The data contract is designed to accept future monthly features such as:

- cotton lint / domestic cotton benchmark
- ICE cotton or other relevant benchmark
- USD/INR
- crude / energy cost proxy
- spinning power cost
- yarn demand / order volume
- inventory days / stock cover
- export/import indicators
- season/month effects
- production capacity/utilisation

The current repository's official yarn history primarily contains yarn-price observations, so the engine does not invent these external drivers. When real aligned driver columns are added to the ETL dataset, the ML/SARIMAX pipeline can be extended to use them.

## Price basis governance

Official historical observations and current public market-report indications are displayed separately. A current market range must not be silently inserted into official history. This avoids misleading jumps caused by differences in source, location, ex-mill/market basis, GST or specification.

## Run locally

Requirements: Node.js 20+, Python 3.10+.

```bash
git clone https://github.com/Vignesh-S-V/textile-intelligence-platform.git
cd textile-intelligence-platform
npm install
pip install -r requirements.txt
npm start
```

Open `http://localhost:10000`.

## Deployment

For Render, install Python requirements during build and run the Node server:

```text
Build: pip install -r requirements.txt && npm install
Start: node server.js
```

Set `PYTHON_BIN=python3` if required by the host.

## Main files

- `index.html` — focused yarn intelligence/forecast UI
- `styles.css` — responsive enterprise design
- `app.js` — API loading, cascading filters, market table, pagination and forecast request
- `forecast.js` — chart rendering and model leaderboard UI
- `forecast.py` — preprocessing, feature engineering, models and rolling validation
- `server.js` — Express API and Python forecast bridge
- `data/yarn.json` — normalized official yarn history
- `data/live_yarn.json` — current public market indicators
- `scripts/` — source ingestion jobs
- `.github/workflows/` — automated ingestion and validation

## Quality rules

- Never copy current price backward into history.
- Never replace a missing source observation with a guessed quote.
- Never claim model accuracy that has not been backtested.
- Preserve source/location/specification lineage.
- Prefer exact product identity and location filters before model fitting.

## Current public source links

- Textile Commissioner — Cotton Yarn Prices: https://www.txcindia.gov.in/html/ecomicsection/Cotton%20Yarn%20Prices.pdf
- NTC Southern Region archive: https://www.ntcltd.org/SRO_oldRecords.aspx
- NTC Western Region archive: https://www.ntcltd.org/WRO_oldRecords.aspx
- NHDC Yarn Rates: https://nhdc.org.in/yarnrate.aspx
