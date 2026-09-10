# Textile Intelligence Platform

Focused enterprise application for textile yarn market intelligence and evidence-based price forecasting.

## UI scope

The application intentionally removes the unused Executive Dashboard, Operations, Analytics, Data Quality, Reports and Methodology pages. The workflow is now centered on **Yarn Intelligence + Forecasting**.

## Forecasting pipeline

The forecast service is Python-backed at `POST /api/forecast`.

**Preprocessing:** invalid dates/prices are removed; source observations are aggregated to monthly frequency. Internal gaps may be time-interpolated only when bounded by real observations; endpoints are never fabricated.

**Feature engineering:** lag 1/2/3/6/12, rolling mean and standard deviation over 3/6/12 months, month seasonality encoded as sin/cos, and trend.

**Models benchmarked:** SARIMAX, Holt Exponential Smoothing, Damped Trend, Seasonal Naive, Gradient Boosting with lag/rolling features, Ridge with lag/rolling features, Drift and Recent Mean.

**Validation:** rolling-origin out-of-sample validation. MAPE is the primary ranking metric and RMSE is the tie-breaker. Random train/test splitting is deliberately not used for time series.

**Selection:** lowest validated MAPE wins, then the winner is retrained on all available history for the selected horizon (3, 6 or 12 months).

The platform does not hard-code 95%/99% accuracy. Accuracy is an empirical historical backtest score and future shocks cannot be guaranteed.

## Textile-industry drivers

For a stronger production forecast, aligned monthly exogenous variables should be supplied by ETL: domestic cotton/lint benchmark, ICE cotton benchmark, USD/INR, energy/power cost, demand/order volume, inventory days, export/import indicators, seasonality and capacity utilisation. The engine never invents unavailable drivers.

## Price-basis governance

Official historical observations and current public market-report indications remain separate. Market ranges are not silently inserted into historical series because source, location, ex-mill/market basis, GST and specification can differ.

## Run locally

Requirements: Node.js 20+ and Python 3.10+.

```bash
npm install
pip install -r requirements.txt
npm start
```

Open `http://localhost:10000`.

## Deployment

The server must have Python dependencies installed before starting Node because `/api/forecast` invokes `forecast.py`.

```text
pip install -r requirements.txt && npm install
node server.js
```

Set `PYTHON_BIN=python3` if the host uses a non-default Python executable.

## Main files

- `index.html` — focused yarn intelligence/forecast UI
- `styles.css` — responsive enterprise UI
- `app.js` — data loading, stable cascading filters, market comparison, pagination, forecast request and forecast chart rendering
- `forecast.py` — preprocessing, features, models and rolling validation
- `server.js` — Express APIs and Python forecast bridge
- `data/yarn.json` — normalized official yarn history
- `data/live_yarn.json` — public market indicators
- `requirements.txt` — Python forecasting dependencies
- `scripts/` — source ingestion
- `.github/workflows/` — automated ingestion/validation

## Quality rules

- Never copy a current price backward into history.
- Never replace a missing source observation with a guessed quote.
- Never claim unvalidated model accuracy.
- Preserve source/location/specification lineage.
- Prefer exact product identity and location filters before model fitting.
