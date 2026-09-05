import { expect, test, type Download, type Page } from '@playwright/test';

const realSession = {
  id: 'real-session',
  startedAt: '2026-08-20T10:00:00.000Z',
  durationSeconds: 30,
  targetLow: 120,
  targetHigh: 150,
  inBandPercent: 0,
  averageWpm: 0,
  samples: [],
};

async function putSession(page: Page, databaseName: string, record: unknown): Promise<void> {
  await page.evaluate(async ({ databaseName, record }) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName);
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
  }, { databaseName, record });
}

async function sessionIds(page: Page, databaseName: string): Promise<string[]> {
  return page.evaluate(async (databaseName) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const ids = await new Promise<string[]>((resolve, reject) => {
      const request = database.transaction('sessions').objectStore('sessions').getAllKeys();
      request.onsuccess = () => resolve(request.result.map(String));
      request.onerror = () => reject(request.error);
    });
    database.close();
    return ids;
  }, databaseName);
}

async function downloadText(download: Download): Promise<string> {
  const stream = await download.createReadStream();
  if (!stream) throw new Error('The browser did not provide the exported file.');
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

test('@claim:demo-sandbox sample data resets without changing real sessions or settings', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('pace-settings', JSON.stringify({ low: 110, high: 140, pattern: 'ridge' })));
  await putSession(page, 'pace-trail', realSession);

  await page.goto('/?demo=1');
  await expect(page.getByLabel('Demo mode')).toContainText('Demo — sample data, nothing is saved');
  await expect(page.getByRole('heading', { name: 'Staff update rehearsal' })).toBeVisible();
  await page.locator('#pace-low').evaluate((node) => {
    const input = node as HTMLInputElement;
    input.value = '60';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.locator('#toast')).toContainText('Sample data reset');
  await page.getByRole('button', { name: 'Start for real' }).click();
  await page.waitForURL(/\/$/);

  await expect(page.locator('#low-output')).toHaveText('110');
  expect(await page.evaluate(() => localStorage.getItem('pace-settings'))).toContain('110');
  expect(await sessionIds(page, 'pace-trail')).toEqual(['real-session']);
  expect(await page.evaluate(() => localStorage.getItem('demo:pace-settings'))).toBeNull();
});

test('@claim:demo-sample-results sample mode displays populated speaking pace results', async ({ page }) => {
  await page.goto('/demo/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('See sample speaking pace results');
  await expect(page.getByRole('heading', { name: 'Four saved rehearsals' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Staff update rehearsal' })).toBeVisible();
  await expect(page.locator('.demo-preview').getByText(/143 avg WPM · 88% in range/).first()).toBeVisible();
  await expect(page.locator('.session-list > li')).toHaveCount(3);
  await expect(page.locator('.sparkline[aria-label*="143 words per minute"]').first()).toBeVisible();
});

test('@claim:offline-reload demo works offline after its first visit', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto('/demo/');
    await page.waitForFunction(() => Boolean(navigator.serviceWorker));
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('See sample speaking pace results');
    await expect(page.locator('#network-strip')).toContainText('offline');
  } finally {
    await context.close();
  }
});

test('@claim:local-audio-processing demo has no outbound requests during free use', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/demo/');
  await page.getByRole('button', { name: 'Export JSON and CSV' }).click();
  await expect(page.locator('#toast')).toContainText('exports downloaded');
  const origin = new URL(page.url()).origin;
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.every((url) => new URL(url).origin === origin)).toBe(true);
});

test('@claim:data-export demo exports JSON and CSV with every saved session', async ({ page }) => {
  await page.goto('/demo/');
  const downloads: Download[] = [];
  page.on('download', (download) => downloads.push(download));
  await page.getByRole('button', { name: 'Export JSON and CSV' }).click();
  await expect.poll(() => downloads.length).toBe(2);
  const byName = new Map(await Promise.all(downloads.map(async (download) => [download.suggestedFilename(), await downloadText(download)] as const)));
  const json = JSON.parse(byName.get('pace-trail-export.json') ?? '{}') as { sessions?: unknown[] };
  const csv = byName.get('pace-trail-sessions.csv') ?? '';

  expect(json.sessions).toHaveLength(4);
  expect(csv.split('\n')[0]).toBe('session_id,started_at,seconds,target_low,target_high,in_band_percent,average_wpm');
  expect(csv.trim().split('\n')).toHaveLength(5);
});

test('@claim:pace-band demo accepts the full 60 to 240 WPM target range', async ({ page }) => {
  await page.goto('/demo/');
  await page.locator('#pace-low').evaluate((node) => {
    const input = node as HTMLInputElement;
    input.value = '60';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('#pace-high').evaluate((node) => {
    const input = node as HTMLInputElement;
    input.value = '240';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('#low-output')).toHaveText('60');
  await expect(page.locator('#high-output')).toHaveText('240');
  expect(await page.evaluate(() => localStorage.getItem('demo:pace-settings'))).toContain('240');
  expect(await page.evaluate(() => localStorage.getItem('pace-settings'))).toBeNull();
});

test('@claim:haptic-cue demo sends the selected tactile test cue through device vibration', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (duration: number | number[]) => {
        const testWindow = window as typeof window & { __vibrationDurations?: Array<number | number[]> };
        testWindow.__vibrationDurations ??= [];
        testWindow.__vibrationDurations.push(duration);
        return true;
      },
    });
  });
  await page.goto('/demo/');
  await page.getByRole('button', { name: 'Test selected tap' }).click();
  await expect(page.locator('#toast')).toContainText('One tap sent');
  const calls = await page.evaluate(() => (window as typeof window & { __vibrationDurations?: Array<number | number[]> }).__vibrationDurations);
  expect(calls).toHaveLength(1);
  expect(calls?.flat()).toContain(43);
});

test('@claim:paid-unlock a verified one-time license reveals all saved sessions', async ({ page }) => {
  await page.addInitScript(() => {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href);
      if (url.pathname === '/api/license/verify' && url.searchParams.get('license') === 'sample-license') {
        return Promise.resolve(new Response(JSON.stringify({ valid: true, reason: 'ok', expires_at: null }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }));
      }
      return nativeFetch(input, init);
    }) as typeof window.fetch;
  });
  await page.goto('/demo/');
  await expect(page.getByText('For $7 once')).toBeVisible();
  await expect(page.locator('.session-list > li')).toHaveCount(3);
  await page.getByRole('button', { name: 'Have a license? Restore it' }).click();
  await page.getByLabel('License token').fill('sample-license');
  await page.getByRole('button', { name: 'Verify license' }).click();
  await expect(page.getByText('Full session history is active on this device.')).toBeVisible();
  await expect(page.locator('.session-list > li')).toHaveCount(4);
  expect(await page.evaluate(() => localStorage.getItem('sb_license:haptic-speaking-pacer'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('demo:sb_license:haptic-speaking-pacer'))).toBe('sample-license');
});
