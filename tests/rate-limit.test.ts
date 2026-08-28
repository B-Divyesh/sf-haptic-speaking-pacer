import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const verifyLicense = require('../api/license-verify/index.cjs') as {
  (context: { log: { warn: () => void } }, request: unknown): Promise<{ status: number; headers: Record<string, string>; body: string }>;
  LIMIT: number;
  _resetRateLimiter: () => void;
};

describe('license verification gateway', () => {
  afterEach(() => {
    verifyLicense._resetRateLimiter();
    vi.unstubAllGlobals();
  });

  it('returns 429 and Retry-After after 20 checks from one client', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response('{"valid":false,"reason":"invalid","expires_at":null}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })));
    const context = { log: { warn: vi.fn() } };
    const request = { headers: { 'x-forwarded-for': '198.51.100.10' }, query: { license: 'qa-invalid-token' } };

    const allowed = await Promise.all(Array.from({ length: verifyLicense.LIMIT }, () => verifyLicense(context, request)));
    expect(allowed.every((response) => response.status === 200)).toBe(true);

    const limited = await verifyLicense(context, request);
    expect(limited.status).toBe(429);
    expect(Number(limited.headers['Retry-After'])).toBeGreaterThan(0);
    expect(limited.headers['Cache-Control']).toBe('no-store');
  });

  it('allows the packaged iOS origin without opening public CORS', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"valid":false}', { status: 200 })));
    const context = { log: { warn: vi.fn() } };
    const packaged = await verifyLicense(context, { headers: { origin: 'capacitor://localhost' }, query: { license: 'token' } });
    const foreign = await verifyLicense(context, { headers: { origin: 'https://example.com' }, query: { license: 'token' } });
    expect(packaged.headers['Access-Control-Allow-Origin']).toBe('capacitor://localhost');
    expect(foreign.headers['Access-Control-Allow-Origin']).toBeUndefined();
  });
});
