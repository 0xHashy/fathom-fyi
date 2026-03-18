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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const sessionId = req.query.session_id;
  if (!sessionId) return res.status(400).json({ error: 'Missing session_id' });

  if (KV_URL && KV_TOKEN) {
    const sessionRec = await kvGet(`session:${sessionId}`);
    if (sessionRec && sessionRec.key) {
      return res.status(200).json({ key: sessionRec.key, tier: sessionRec.tier });
    }

    const sk = process.env.STRIPE_SECRET_KEY;
    if (sk) {
      try {
        const sRes = await fetch(
          `https://api.stripe.com/v1/checkout/sessions/${sessionId}`,
          { headers: { Authorization: `Bearer ${sk}` } }
        );
        if (sRes.ok) {
          const session = await sRes.json();
          const custId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
          if (custId) {
            const custRec = await kvGet(`customer:${custId}`);
            if (custRec && custRec.key) {
              return res.status(200).json({ key: custRec.key, tier: custRec.tier });
            }
          }
        }
      } catch {}
    }
  }

  return res.status(404).json({ error: 'Key not found. Payment may still be processing. Refresh in 30 seconds.' });
}
