import { test, expect } from '@playwright/test';

test('forecast renders through the UI without console errors', async ({ page }) => {
  const failures = [];
  const forecastResponses = [];
  page.on('console', msg => { if (msg.type() === 'error') failures.push(`console: ${msg.text()}`); });
  page.on('pageerror', error => failures.push(`pageerror: ${error.message}`));
  page.on('response', response => {
    if (response.url().includes('/api/forecast')) forecastResponses.push(response.status());
  });

  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:10000', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect.poll(async () => page.locator('#fiber option').count(), { timeout: 60_000 }).toBeGreaterThan(1);
  await page.locator('#fiber').selectOption({ index: 1 });
  await expect.poll(async () => page.locator('#product option').count(), { timeout: 60_000 }).toBeGreaterThan(1);
  await page.locator('#product').selectOption({ index: 1 });
  await expect.poll(async () => page.locator('#yarn_type option').count(), { timeout: 60_000 }).toBeGreaterThan(1);
  await page.locator('#yarn_type').selectOption({ index: 1 });
  await expect.poll(async () => page.locator('#count option').count(), { timeout: 60_000 }).toBeGreaterThan(1);
  await page.locator('#count').selectOption({ index: 1 });

  // The app intentionally rebuilds dependent selectors and can issue overlapping
  // forecast calls. Wait for the final request after the cascading selections settle.
  await expect.poll(() => forecastResponses.some(status => status === 200), { timeout: 120_000 }).toBeTruthy();
  await expect(page.locator('#forecast-meta')).toContainText('Rolling backtest', { timeout: 120_000 });
  expect(forecastResponses.every(status => [200, 400].includes(status))).toBeTruthy();
  expect(forecastResponses.filter(status => status === 200).length).toBeGreaterThan(0);
  await expect(page.locator('#forecast-chart')).toBeVisible();
  expect(await page.locator('#forecast-chart').evaluate(canvas => Boolean(canvas.getContext('2d')))).toBeTruthy();
  expect(failures).toEqual([]);
});
