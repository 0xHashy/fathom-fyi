// POST /api/rotate-key
// Rotate a paid customer's API key. Deactivates the old key, issues a new one.
// Auth: Bearer token in Authorization header (current key).
// Rate limit: 3 rotations per day per key.

import { randomBytes } from 'crypto';

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

async function kvSet(key, value, exSeconds) {
  if (exSeconds) {
    return kvCommand('SET', key, JSON.stringify(value), 'EX', exSeconds);
  }
  return kvCommand('SET', key, JSON.stringify(value));
}

const _rl = new Map();

function _sec(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Access-Control-Allow-Origin', 'https://fathom.fyi');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  return true;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    _sec(req, res);
    return res.status(200).end();
  }

  _sec(req, res);

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!KV_URL || !KV_TOKEN) {
    return res.status(503).json({ success: false, error: 'Key store not configured' });
  }

  // Extract Bearer token
  const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
  const match = authHeader.match(/^Bearer\s+(fathom_sk_\S+)$/i);
  if (!match) {
    return res.status(401).json({ success: false, error: 'Missing or invalid Authorization header. Expected: Bearer fathom_sk_xxx' });
  }

  const currentKey = match[1];

  // Verify the current key exists and is active
  const keyRecord = await kvGet(`key:${currentKey}`);
  if (!keyRecord || !keyRecord.active) {
    return res.status(401).json({ success: false, error: 'Invalid or inactive API key.' });
  }

  // Rate limit: max 3 rotations per day per key
  const rateLimitKey = `rotate_rl:${currentKey}`;
  const rlRaw = await kvGet(rateLimitKey);
  const rlCount = typeof rlRaw === 'number' ? rlRaw : 0;
  if (rlCount >= 3) {
    return res.status(429).json({ success: false, error: 'Rate limit exceeded. Maximum 3 key rotations per day.' });
  }

  // Generate new key
  const newKey = 'fathom_sk_' + randomBytes(16).toString('hex');

  // Store new key with same tier and customer_id
  const newKeyRecord = {
    tier: keyRecord.tier,
    customer_id: keyRecord.customer_id,
    active: true,
    created_at: new Date().toISOString(),
    rotated_from: currentKey.slice(0, 14) + '...',
  };
  await kvSet(`key:${newKey}`, newKeyRecord);

  // Deactivate old key
  const deactivatedRecord = {
    ...keyRecord,
    active: false,
    deactivated_at: new Date().toISOString(),
    rotated_to: newKey.slice(0, 14) + '...',
  };
  await kvSet(`key:${currentKey}`, deactivatedRecord);

  // Update customer reverse lookup to point to new key
  if (keyRecord.customer_id) {
    const customerRecord = await kvGet(`customer:${keyRecord.customer_id}`);
    if (customerRecord) {
      const updatedCustomer = { ...customerRecord, key: newKey };
      await kvSet(`customer:${keyRecord.customer_id}`, updatedCustomer);
    }
  }

  // Increment rate limit counter (expires in 24 hours)
  await kvCommand('INCR', rateLimitKey);
  await kvCommand('EXPIRE', rateLimitKey, 86400);

  return res.status(200).json({
    success: true,
    new_key: newKey,
    old_key_deactivated: true,
    message: 'Key rotated successfully. Update your MCP config with the new key.',
  });
}
