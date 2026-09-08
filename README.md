# India Cotton Market Prices — Live Dashboard (100% Free Hosting)

Real data only, from the official Government of India Open Data API
(AGMARKNET Mandi Prices — no scraping, no dummy/sample values).

The API key stays on the server side (Vercel Environment Variable) and is
**never** sent to or visible in the browser. Frontend only calls our own
`/api/prices` endpoint.

## Deploy for free in 5 minutes

1. **Push this folder to a GitHub repo** (public or private, both fine).

2. **Go to [vercel.com](https://vercel.com)** → Sign up / Log in with your
   GitHub account (free, no credit card needed).

3. Click **"Add New Project"** → select this GitHub repo → click **Deploy**.
   Vercel auto-detects the `api/prices.js` file as a Serverless Function and
   `index.html` as the static site. No configuration needed.

4. **Add your API key (recommended):**
   - Get a free key at [data.gov.in](https://www.data.gov.in/) → Sign in →
     My Account → API Key (takes ~1 minute).
   - In Vercel: Project → Settings → Environment Variables →
     add `DATA_GOV_API_KEY` = `<your key>` → Save → Redeploy.
   - Without this step it still works using a shared demo key, but that key
     is rate-limited since everyone uses it.

5. Vercel gives you a free live URL like `https://your-project.vercel.app`.
   Every time you `git push`, it auto-redeploys.

## Files

- `index.html` — the frontend (filters, table, sorting). Contains no API
  key or external API URL anywhere.
- `api/prices.js` — the only place that talks to the government API and
  holds the key (via `process.env.DATA_GOV_API_KEY`).

## Local testing (optional)

```bash
npm i -g vercel
vercel dev
```
