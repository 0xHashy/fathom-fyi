const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function kvCommand(...args) {
  if (!KV_URL || !KV_TOKEN) return null;
  const res = await fetch(KV_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.result ?? null;
}

async function kvGet(key) {
  const raw = await kvCommand('GET', key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

import { rateLimit, setSecurityHeaders, sanitizeQuery } from './_security.js';

export default async function handler(req, res) {
  setSecurityHeaders(res);
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!rateLimit(req, res)) return;
  req.query = sanitizeQuery(req.query);
  if (req.method !== 'GET') return res.status(405).json({ valid: false, error: 'Method not allowed' });

  const key = req.query.key;
  if (!key || typeof key !== 'string') {
    return res.status(200).json({ valid: false, tier: 'free', message: 'No API key provided. Free tier active.' });
  }

  if (KV_URL && KV_TOKEN) {
    const record = await kvGet(`key:${key}`);
    if (record && record.active) {
      return res.status(200).json({ valid: true, tier: record.tier, message: `Authenticated. ${record.tier} tier active.` });
    }
    if (record && !record.active) {
      return res.status(200).json({ valid: false, tier: 'free', message: 'API key inactive. Subscription may have expired.' });
    }
  }

  try {
    const raw = process.env.FATHOM_KEYS;
    if (raw) {
      const keys = JSON.parse(raw);
      if (keys[key]) return res.status(200).json({ valid: true, tier: keys[key], message: `Authenticated. ${keys[key]} tier active.` });
    }
  } catch {}

  return res.status(200).json({ valid: false, tier: 'free', message: 'Invalid API key. Free tier active.' });
}
