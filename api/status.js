// GET /api/status
// Public health check endpoint. Shows system status at a glance.
// No auth required. Useful for you to check, and for users to verify the service.

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function checkKv() {
  if (!KV_URL || !KV_TOKEN) return 'not_configured';
  try {
    const res = await fetch(KV_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['PING']),
    });
    if (!res.ok) return 'error';
    const data = await res.json();
    return data.result === 'PONG' ? 'ok' : 'error';
  } catch { return 'error'; }
}

async function checkStripe() {
  const sk = process.env.STRIPE_SECRET_KEY;
  if (!sk) return 'not_configured';
  try {
    const res = await fetch('https://api.stripe.com/v1/balance', {
      headers: { Authorization: `Bearer ${sk}` },
    });
    return res.ok ? 'ok' : 'error';
  } catch { return 'error'; }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const [kv, stripe] = await Promise.all([checkKv(), checkStripe()]);

  const allOk = kv === 'ok' && stripe === 'ok';

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'operational' : 'degraded',
    services: {
      api: 'ok',
      key_store: kv,
      payments: stripe,
    },
    version: '4.2.0',
    tools: 27,
    timestamp: new Date().toISOString(),
  });
}
