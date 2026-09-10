import { test, expect } from '@playwright/test';

test('forecast renders through the UI without console errors', async ({ page }) => {
  test.setTimeout(180_000);
  const failures = [];
  const forecastResponses = [];
  page.on('console', msg => { if (msg.type() === 'error') failures.push(`console: ${msg.text()}`); });
  page.on('pageerror', error => failures.push(`pageerror: ${error.message}`));
  page.on('response', response => {
    if (response.url().includes('/api/forecast')) forecastResponses.push(response.status());
  });

  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:10000', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect.poll(async () => page.locator('#fiber option').count(), { timeout: 60_000 }).toBeGreaterThan(1);

  // Use a single stable selector path known to have ample monthly history.
  await page.locator('#fiber').selectOption({ index: 1 });
  await page.waitForTimeout(250);
  await expect.poll(async () => page.locator('#product option').count(), { timeout: 60_000 }).toBeGreaterThan(1);
  await page.locator('#product').selectOption({ index: 1 });
  await page.waitForTimeout(250);
  await expect.poll(async () => page.locator('#yarn_type option').count(), { timeout: 60_000 }).toBeGreaterThan(1);
  await page.locator('#yarn_type').selectOption({ index: 1 });
  await page.waitForTimeout(250);
  await expect.poll(async () => page.locator('#count option').count(), { timeout: 60_000 }).toBeGreaterThan(1);
  await page.locator('#count').selectOption({ index: 1 });

  // The production UI can emit intermediate forecast requests while cascading filters rebuild.
  // Success is defined by the final stable request and rendered result, not every transient request.
  await expect.poll(async () => {
    const meta = await page.locator('#forecast-meta').innerText();
    return meta.includes('Rolling backtest');
  }, { timeout: 120_000, intervals: [250, 500, 1000, 2000] }).toBeTruthy();

  expect(forecastResponses.some(status => status === 200)).toBeTruthy();
  expect(forecastResponses.some(status => status >= 500)).toBeFalsy();
  await expect(page.locator('#forecast-chart')).toBeVisible();
  expect(await page.locator('#forecast-chart').evaluate(canvas => Boolean(canvas.getContext('2d')))).toBeTruthy();
  expect(failures).toEqual([]);
});
