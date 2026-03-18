import { createHmac, timingSafeEqual, randomFillSync } from 'crypto';

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

async function kvSet(key, value, ex) {
  if (ex) return kvCommand('SET', key, JSON.stringify(value), 'EX', ex);
  return kvCommand('SET', key, JSON.stringify(value));
}

async function kvGet(key) {
  const raw = await kvCommand('GET', key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

function verifySignature(rawBody, sigHeader) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !sigHeader) return false;
  const parts = {};
  sigHeader.split(',').forEach(p => { const [k, v] = p.split('='); parts[k] = v; });
  if (!parts.t || !parts.v1) return false;
  const age = Math.floor(Date.now() / 1000) - parseInt(parts.t);
  if (age > 300) return false;
  const expected = createHmac('sha256', secret).update(`${parts.t}.${rawBody}`).digest('hex');
  try { return timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected)); } catch { return false; }
}

async function getSession(sessionId) {
  const sk = process.env.STRIPE_SECRET_KEY;
  if (!sk) return null;
  const r = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${sessionId}?expand[]=line_items`,
    { headers: { Authorization: `Bearer ${sk}` } }
  );
  if (!r.ok) return null;
  return r.json();
}

function tierFromName(name) {
  const l = (name || '').toLowerCase();
  if (l.includes('trading bot')) return 'trading_bot';
  if (l.includes('pro')) return 'pro';
  return 'starter';
}

function generateKey() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'fathom_sk_';
  const bytes = new Uint8Array(32);
  randomFillSync(bytes);
  for (const b of bytes) key += chars[b % chars.length];
  return key;
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  const rawBody = Buffer.concat(chunks).toString('utf-8');

  if (!verifySignature(rawBody, req.headers['stripe-signature'])) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(rawBody);

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const customerId = session.customer;
      const email = session.customer_details?.email || '';

      let tier = 'starter';
      const full = await getSession(session.id);
      if (full?.line_items?.data?.[0]) {
        const item = full.line_items.data[0];
        tier = tierFromName(item.description || item.price?.product?.name || '');
      }

      const existing = await kvGet(`customer:${customerId}`);
      if (existing && existing.key) {
        const rec = await kvGet(`key:${existing.key}`);
        if (rec) {
          rec.tier = tier; rec.active = true; rec.updated_at = new Date().toISOString();
          await kvSet(`key:${existing.key}`, rec);
          await kvSet(`customer:${customerId}`, { ...existing, tier });
          await kvSet(`session:${session.id}`, { key: existing.key, tier }, 3600);
          return res.status(200).json({ received: true });
        }
      }

      const apiKey = generateKey();
      const now = new Date().toISOString();
      await kvSet(`key:${apiKey}`, { tier, customer_id: customerId, email, active: true, created_at: now });
      await kvSet(`customer:${customerId}`, { key: apiKey, tier, email, created_at: now });
      await kvSet(`session:${session.id}`, { key: apiKey, tier }, 3600);

    } else if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const customerId = sub.customer;
      const rec = await kvGet(`customer:${customerId}`);
      if (rec && rec.key) {
        const keyRec = await kvGet(`key:${rec.key}`);
        if (keyRec) {
          keyRec.active = false; keyRec.deactivated_at = new Date().toISOString();
          await kvSet(`key:${rec.key}`, keyRec);
        }
      }
    }
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }

  return res.status(200).json({ received: true });
}

export default handler;
export const config = { api: { bodyParser: false } };
