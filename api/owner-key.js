// One-time use: generate an owner API key with unlimited tier.
// DELETE THIS FILE after generating your key.

import { randomFillSync } from 'crypto';

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const OWNER_SECRET = process.env.OWNER_SECRET || 'fathom-owner-2026';

async function kvCommand(...args) {
  const res = await fetch(KV_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.result ?? null;
}

function generateKey() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'fathom_sk_';
  const bytes = new Uint8Array(32);
  randomFillSync(bytes);
  for (const b of bytes) key += chars[b % chars.length];
  return key;
}

export default async function handler(req, res) {
  // Simple auth — prevent random people from hitting this
  if (req.query.secret !== OWNER_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const apiKey = generateKey();
  const now = new Date().toISOString();

  await kvCommand('SET', `key:${apiKey}`, JSON.stringify({
    tier: 'unlimited',
    customer_id: 'owner',
    email: 'owner@fathom.fyi',
    active: true,
    created_at: now,
  }));

  res.status(200).json({
    key: apiKey,
    tier: 'unlimited',
    message: 'Owner key created. Add this to your bot .env as FATHOM_API_KEY. Then DELETE api/owner-key.js.',
  });
}
