import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('home is accessible and responsive at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page).toHaveTitle(/Haptic Speaking Pacer/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Practice a steady speaking pace');
  await expect(page.getByRole('link', { name: 'Try it with sample data' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start a practice' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Buy once — $7' })).toHaveAttribute('href', 'https://api.sociobot.in/api/v1/products/haptic-speaking-pacer/checkout');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.getByRole('button', { name: 'Switch color theme' }).click();
  const darkResults = await new AxeBuilder({ page }).analyze();
  expect(darkResults.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
});

test('session import rejects crafted and partial records atomically', async ({ page }) => {
  await page.goto('/');
  const validSession = {
    id: 'valid-session',
    startedAt: '2026-08-28T08:00:00.000Z',
    durationSeconds: 30,
    targetLow: 120,
    targetHigh: 150,
    inBandPercent: 0,
    averageWpm: 0,
    samples: [],
  };
  const crafted = { ...validSession, id: 'crafted-session', averageWpm: '<img src=x onerror="window.__qaXss=1">' };

  await page.locator('#import-file').setInputFiles({
    name: 'crafted.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ sessions: [crafted] })),
  });
  await expect(page.locator('#toast')).toContainText('not a valid Pace Trail export');

  await page.locator('#import-file').setInputFiles({
    name: 'mixed.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ sessions: [validSession, { id: 'only-id-and-samples', samples: [] }] })),
  });
  await expect(page.locator('#toast')).toContainText('not a valid Pace Trail export');

  const storedCount = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('pace-trail');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const count = await new Promise<number>((resolve, reject) => {
      const request = database.transaction('sessions').objectStore('sessions').count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return count;
  });
  expect(storedCount).toBe(0);

  await page.evaluate(async (record) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('pace-trail');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('sessions', 'readwrite');
      transaction.objectStore('sessions').put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  }, crafted);
  await page.reload();
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as typeof window & { __qaXss?: number }).__qaXss)).toBeUndefined();
  await expect(page.getByText('No practice sessions yet')).toBeVisible();
  expect(await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('pace-trail');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const count = await new Promise<number>((resolve, reject) => {
      const request = database.transaction('sessions').objectStore('sessions').count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return count;
  })).toBe(0);
});

test('license restore uses the rate-limited same-origin gateway', async ({ page }) => {
  await page.addInitScript(() => {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href);
      if (url.pathname === '/api/license/verify' && url.searchParams.get('license') === 'restored-token') {
        return Promise.resolve(new Response(JSON.stringify({ valid: true, reason: 'ok', expires_at: null }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }));
      }
      return nativeFetch(input, init);
    }) as typeof window.fetch;
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Have a license? Restore it' }).click();
  await page.getByLabel('License token').fill('restored-token');
  await page.getByRole('button', { name: 'Verify license' }).click();
  await expect(page.getByText('Full session history is active on this device.')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('sb_license:haptic-speaking-pacer'))).toBe('restored-token');
});

test('settings survive refresh and legal pages have one main heading', async ({ page }) => {
  await page.goto('/');
  await page.locator('#pace-low').fill('110');
  await page.reload();
  await expect(page.locator('#low-output')).toHaveText('110');
  await page.goto('/privacy/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('main')).toContainText('speech audio stays on your device');
  await page.goto('/terms/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
});

test('demo, crawler files, and the designed 404 page have dedicated routes', async ({ page }) => {
  const robots = await page.request.get('/robots.txt');
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain('Sitemap: https://haptic-speaking-pacer.sociobot.in/sitemap.xml');
  const sitemap = await page.request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain('https://haptic-speaking-pacer.sociobot.in/demo');

  await page.goto('/404.html');
  await expect(page).toHaveTitle('Page not found — Haptic Speaking Pacer');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
  await expect(page.getByRole('link', { name: 'Open the pacer' })).toBeVisible();
});

test('app shell and saved settings work offline', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForFunction(() => navigator.serviceWorker?.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Practice a steady speaking pace');
  await expect(page.locator('#network-strip')).toContainText('offline');
  await context.setOffline(false);
});

test('a blocked microphone gives a useful recovery message', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')) },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start a practice' }).click();
  await expect(page.locator('#toast')).toContainText('Allow it in browser or device settings');
  await expect(page.getByRole('button', { name: 'Start a practice' })).toBeEnabled();
});
