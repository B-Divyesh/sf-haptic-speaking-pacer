'use strict';

const UPSTREAM = 'https://api.sociobot.in/api/v1/products/haptic-speaking-pacer/verify';
const WINDOW_MS = 60_000;
const LIMIT = 20;
const requestsByClient = new Map();

function header(req, name) {
  if (typeof req.headers?.get === 'function') return req.headers.get(name);
  return req.headers?.[name] || req.headers?.[name.toLowerCase()] || '';
}

function clientKey(req) {
  const forwarded = String(header(req, 'x-forwarded-for') || header(req, 'x-azure-clientip') || 'unknown');
  return forwarded.split(',').map((part) => part.trim()).filter(Boolean).at(-1) || 'unknown';
}

function checkLimit(key, now = Date.now()) {
  const recent = (requestsByClient.get(key) || []).filter((timestamp) => now - timestamp < WINDOW_MS);
  if (recent.length >= LIMIT) {
    requestsByClient.set(key, recent);
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now) / 1000)), remaining: 0 };
  }
  recent.push(now);
  requestsByClient.set(key, recent);
  return { allowed: true, retryAfter: 0, remaining: LIMIT - recent.length };
}

async function verifyLicense(context, req) {
  const rate = checkLimit(clientKey(req));
  const origin = String(header(req, 'origin'));
  const rateHeaders = {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-RateLimit-Limit': String(LIMIT),
    'X-RateLimit-Remaining': String(rate.remaining),
  };
  if (origin === 'capacitor://localhost') {
    rateHeaders['Access-Control-Allow-Origin'] = origin;
    rateHeaders.Vary = 'Origin';
  }
  if (!rate.allowed) {
    return { status: 429, headers: { ...rateHeaders, 'Retry-After': String(rate.retryAfter) }, body: JSON.stringify({ error: 'Too many verification requests. Try again shortly.' }) };
  }

  const license = String(req.query?.license ?? '').trim();
  if (!license || license.length > 4096) {
    return { status: 400, headers: rateHeaders, body: JSON.stringify({ valid: false, reason: 'invalid', expires_at: null }) };
  }

  try {
    const response = await fetch(`${UPSTREAM}?license=${encodeURIComponent(license)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    });
    const body = await response.text();
    const headers = { ...rateHeaders };
    const retryAfter = response.headers.get('retry-after');
    if (retryAfter) headers['Retry-After'] = retryAfter;
    return { status: response.status, headers, body };
  } catch (error) {
    context.log.warn('License verification upstream unavailable.', error instanceof Error ? error.message : 'unknown error');
    return { status: 502, headers: rateHeaders, body: JSON.stringify({ error: 'License verification is temporarily unavailable.' }) };
  }
}

verifyLicense._checkLimit = checkLimit;
verifyLicense._resetRateLimiter = () => requestsByClient.clear();
verifyLicense.LIMIT = LIMIT;

module.exports = verifyLicense;
