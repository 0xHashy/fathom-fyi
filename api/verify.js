// GET /api/verify?key=fathom_sk_xxx
// Validates an API key and returns the tier.
// Checks Vercel KV first, falls back to FATHOM_KEYS env var.

import { kvGet, kvFallbackLookup, isKvConfigured } from './_lib/kv.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ valid: false, error: 'Method not allowed' });

  const key = req.query.key;

  if (!key || typeof key !== 'string') {
    return res.status(200).json({
      valid: false,
      tier: 'free',
      message: 'No API key provided. Free tier active.',
    });
  }

  // Check KV store
  if (isKvConfigured()) {
    const record = await kvGet(`key:${key}`);
    if (record && record.active) {
      return res.status(200).json({
        valid: true,
        tier: record.tier,
        message: `Authenticated. ${record.tier} tier active.`,
      });
    }
    if (record && !record.active) {
      return res.status(200).json({
        valid: false,
        tier: 'free',
        message: 'API key is inactive. Subscription may have expired. Renew at https://fathom.fyi',
      });
    }
  }

  // Fallback to env var
  const fallback = kvFallbackLookup(key);
  if (fallback) {
    return res.status(200).json({
      valid: true,
      tier: fallback.tier,
      message: `Authenticated. ${fallback.tier} tier active.`,
    });
  }

  return res.status(200).json({
    valid: false,
    tier: 'free',
    message: 'Invalid API key. Free tier active. Get a key at https://fathom.fyi',
  });
}
