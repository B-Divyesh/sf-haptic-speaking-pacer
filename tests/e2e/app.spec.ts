import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('home is accessible and responsive at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page).toHaveTitle(/Haptic Speaking Pacer/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Find a pace');
  await expect(page.getByRole('button', { name: 'Start a practice' })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
});

test('settings survive refresh and legal pages have one main heading', async ({ page }) => {
  await page.goto('/');
  await page.locator('#pace-low').fill('110');
  await page.reload();
  await expect(page.locator('#low-output')).toHaveText('110');
  await page.goto('/privacy/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('main')).toContainText('voice never becomes our data');
  await page.goto('/terms/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
});

test('app shell and saved settings work offline', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForFunction(() => navigator.serviceWorker?.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Find a pace');
  await expect(page.locator('#network-strip')).toContainText('offline');
  await context.setOffline(false);
});
