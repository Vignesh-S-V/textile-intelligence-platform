import { test, expect } from '@playwright/test';

test('forecast renders through the UI without console errors', async ({ page }) => {
  const failures = [];
  const forecastResponses = [];
  page.on('console', msg => { if (msg.type() === 'error') failures.push(`console: ${msg.text()}`); });
  page.on('pageerror', error => failures.push(`pageerror: ${error.message}`));
  page.on('response', response => {
    if (response.url().includes('/api/forecast')) forecastResponses.push(response.status());
  });

  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:10000', { waitUntil: 'networkidle', timeout: 60_000 });
  for (const id of ['fiber', 'product', 'yarn_type', 'count']) {
    await page.locator(`#${id} option`).nth(1).waitFor({ state: 'attached', timeout: 20_000 });
    await page.locator(`#${id}`).selectOption({ index: 1 });
  }

  await expect(page.locator('#forecast-meta')).toContainText('Rolling backtest', { timeout: 60_000 });
  await expect.poll(() => forecastResponses.length, { timeout: 60_000 }).toBeGreaterThan(0);
  expect(forecastResponses.every(status => status === 200)).toBeTruthy();
  await expect(page.locator('#forecast-chart')).toBeVisible();
  expect(await page.locator('#forecast-chart').evaluate(canvas => Boolean(canvas.getContext('2d')))).toBeTruthy();
  expect(failures).toEqual([]);
});
