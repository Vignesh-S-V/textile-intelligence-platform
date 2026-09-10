import { test, expect } from '@playwright/test';

test.setTimeout(180_000);

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

  // Use the same known-good combination used by the Python smoke test.
  // Selecting by value (not option index) makes this deterministic even when
  // the dataset ordering changes.
  await page.locator('#fiber').selectOption('Cotton');
  await expect.poll(async () => page.locator('#product option[value="Cotton Yarn"]').count(), { timeout: 60_000 }).toBe(1);
  await page.locator('#product').selectOption('Cotton Yarn');

  await expect.poll(async () => page.locator('#yarn_type option[value="Combed Yarn"]').count(), { timeout: 60_000 }).toBe(1);
  await page.locator('#yarn_type').selectOption('Combed Yarn');

  await expect.poll(async () => page.locator('#count option[value="20s"]').count(), { timeout: 60_000 }).toBe(1);
  await page.locator('#count').selectOption('20s');

  await expect(page.locator('#fiber')).toHaveValue('Cotton');
  await expect(page.locator('#product')).toHaveValue('Cotton Yarn');
  await expect(page.locator('#yarn_type')).toHaveValue('Combed Yarn');
  await expect(page.locator('#count')).toHaveValue('20s');

  // Wait for the actual final forecast response and rendered metadata.
  await expect.poll(async () => {
    const meta = await page.locator('#forecast-meta').innerText();
    return meta.includes('Rolling backtest');
  }, { timeout: 120_000, intervals: [500, 1000, 2000, 5000] }).toBeTruthy();

  expect(forecastResponses.some(status => status === 200)).toBeTruthy();
  expect(forecastResponses.some(status => status >= 500)).toBeFalsy();
  await expect(page.locator('#forecast-chart')).toBeVisible();
  expect(await page.locator('#forecast-chart').evaluate(canvas => Boolean(canvas.getContext('2d')))).toBeTruthy();

  // Regression: a single selected month must reach the API and render a
  // short-history fallback instead of being blocked by a 12-month UI gate.
  await page.locator('#year').selectOption('2021');
  await page.locator('#month').selectOption('1');
  await expect.poll(async () => {
    const meta = await page.locator('#forecast-meta').innerText();
    return meta.includes('Short-history fallback');
  }, { timeout: 120_000, intervals: [500, 1000, 2000, 5000] }).toBeTruthy();

  expect(forecastResponses.filter(status => status === 200).length).toBeGreaterThanOrEqual(2);
  expect(forecastResponses.some(status => status >= 500)).toBeFalsy();
  await expect(page.locator('#forecast-chart')).toBeVisible();
  expect(await page.locator('#forecast-chart').evaluate(canvas => Boolean(canvas.getContext('2d')))).toBeTruthy();
  expect(failures).toEqual([]);
});
