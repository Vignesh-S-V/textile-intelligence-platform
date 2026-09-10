import { chromium } from 'playwright';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:10000';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const failures = [];
page.on('console', msg => { if (msg.type() === 'error') failures.push(`console: ${msg.text()}`); });
page.on('pageerror', error => failures.push(`pageerror: ${error.message}`));
const forecastResponses = [];
page.on('response', response => {
  if (response.url().includes('/api/forecast')) forecastResponses.push({ status: response.status(), url: response.url() });
});
try {
  await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 60_000 });
  for (const id of ['fiber', 'product', 'yarn_type', 'count']) {
    await page.locator(`#${id} option`).nth(1).waitFor({ state: 'attached', timeout: 20_000 });
    await page.locator(`#${id}`).selectOption({ index: 1 });
  }
  await page.waitForTimeout(1_000);
  const selected = await page.locator('#forecast-meta').innerText();
  if (!selected.includes('Rolling backtest')) throw new Error(`Forecast did not render: ${selected}`);
  if (!forecastResponses.length || forecastResponses.some(x => x.status !== 200)) throw new Error(`Forecast responses were not all successful: ${JSON.stringify(forecastResponses)}`);
  const chart = await page.locator('#forecast-chart').evaluate(canvas => Boolean(canvas && canvas.getContext('2d')));
  if (!chart) throw new Error('Forecast chart canvas is unavailable.');
  if (failures.length) throw new Error(failures.join('\n'));
  console.log('E2E FORECAST TEST OK:', JSON.stringify({ forecastResponses, selected }));
} finally {
  await browser.close();
}
