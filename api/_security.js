// Shared security utilities for all API endpoints

// ─── Rate Limiter (in-memory, per Vercel function instance) ───
const rateLimits = new Map();
const WINDOW_MS = 60_000; // 1 minute window
const MAX_REQUESTS = 60;  // 60 requests per minute per IP

export function rateLimit(req, res) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();

  let entry = rateLimits.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    entry = { count: 0, windowStart: now };
    rateLimits.set(ip, entry);
  }

  entry.count++;

  if (entry.count > MAX_REQUESTS) {
    res.status(429).json({ error: 'Too many requests. Try again shortly.' });
    return false;
  }

  // Cleanup old entries periodically
  if (rateLimits.size > 10000) {
    for (const [k, v] of rateLimits.entries()) {
      if (now - v.windowStart > WINDOW_MS * 2) rateLimits.delete(k);
    }
  }

  return true;
}

// ─── Security Headers ───
export function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Restrict CORS to fathom.fyi only for API endpoints
  res.setHeader('Access-Control-Allow-Origin', 'https://fathom.fyi');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-fathom-key');
}

// ─── Input Sanitization ───
export function sanitizeString(input, maxLength = 200) {
  if (typeof input !== 'string') return '';
  // Strip any HTML/script tags, limit length
  return input.replace(/<[^>]*>/g, '').slice(0, maxLength).trim();
}

export function sanitizeQuery(query) {
  const clean = {};
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'string') {
      clean[key] = sanitizeString(value);
    }
  }
  return clean;
}
