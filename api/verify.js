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

const _rl = new Map();
function _sec(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Access-Control-Allow-Origin', 'https://fathom.fyi');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  let e = _rl.get(ip);
  if (!e || now - e.t > 60000) { e = { c: 0, t: now }; _rl.set(ip, e); }
  if (++e.c > 60) { res.status(429).json({ error: 'Too many requests' }); return false; }
  for (const [k, v] of Object.entries(req.query)) {
    if (typeof v === 'string') req.query[k] = v.replace(/<[^>]*>/g, '').slice(0, 200);
  }
  return true;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!_sec(req, res)) return;
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
