// Authenticated KV store for webhook persistence and user data
// Only accessible with a valid paid Fathom API key

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

async function verifyKey(key) {
  if (!key) return null;
  const raw = await kvCommand('GET', `key:${key}`);
  if (!raw) return null;
  try {
    const rec = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!rec.active) return null;
    if (rec.tier === 'free') return null; // KV not available on free tier
    return rec;
  } catch { return null; }
}

export default async function handler(req, res) {
  // Auth
  const apiKey = req.query.key || req.headers['x-fathom-key'];
  const keyRec = await verifyKey(apiKey);
  if (!keyRec) return res.status(401).json({ error: 'Invalid or unauthorized key' });

  // Namespace keys to prevent cross-customer access
  const prefix = `user:${apiKey.slice(-8)}:`;

  if (req.method === 'GET') {
    const key = req.query.key_name || req.query.key;
    if (!key || typeof key !== 'string') return res.status(400).json({ error: 'key required' });

    // Only allow access to own namespaced keys
    const raw = await kvCommand('GET', prefix + key);
    if (!raw) return res.status(200).json({ value: null });
    try {
      return res.status(200).json({ value: typeof raw === 'string' ? JSON.parse(raw) : raw });
    } catch {
      return res.status(200).json({ value: raw });
    }
  }

  if (req.method === 'POST') {
    const { action, key, value } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (action === 'set' && key && value !== undefined) {
      await kvCommand('SET', prefix + key, JSON.stringify(value));
      return res.status(200).json({ ok: true });
    }

    if (action === 'get' && key) {
      const raw = await kvCommand('GET', prefix + key);
      if (!raw) return res.status(200).json({ value: null });
      try {
        return res.status(200).json({ value: typeof raw === 'string' ? JSON.parse(raw) : raw });
      } catch {
        return res.status(200).json({ value: raw });
      }
    }

    if (action === 'delete' && key) {
      await kvCommand('DEL', prefix + key);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Invalid action. Use set, get, or delete.' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
