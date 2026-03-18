import { createHash } from 'crypto';

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!KV_URL || !KV_TOKEN) return res.status(200).json({ stored: false });

  const body = req.body;
  if (!body || !body.key) return res.status(200).json({ stored: false });

  const keyRec = await kvGet(`key:${body.key}`);
  if (!keyRec || !keyRec.active) return res.status(200).json({ stored: false });

  const agentId = createHash('sha256').update(body.key).digest('hex').slice(0, 12);
  const signal = {
    agent_id: agentId, tier: keyRec.tier, tool: body.tool || 'unknown',
    regime: body.regime || null, posture: body.posture || null,
    risk_score: body.risk_score ?? null, opportunity_score: body.opportunity_score ?? null,
    fear_greed: body.fear_greed ?? null, timestamp: new Date().toISOString(),
  };

  await kvCommand('LPUSH', 'signals', JSON.stringify(signal));
  await kvCommand('LTRIM', 'signals', 0, 4999);

  return res.status(200).json({ stored: true });
}
