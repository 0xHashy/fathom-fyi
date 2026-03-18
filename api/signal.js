// POST /api/signal
// Receives anonymized signals from MCP servers.
// Requires a valid API key. Builds the crowd intelligence dataset.
//
// Body: { key, tool, regime, posture, risk_score, opportunity_score, fear_greed }
// Stores last 5000 signals for crowd aggregation.

import { kvGet, kvLpush, kvLtrim, isKvConfigured } from './_lib/kv.js';
import { createHash } from 'crypto';

const MAX_SIGNALS = 5000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isKvConfigured()) return res.status(200).json({ stored: false, reason: 'Storage not configured' });

  const body = req.body;
  if (!body || !body.key) {
    return res.status(200).json({ stored: false, reason: 'No API key provided' });
  }

  // Verify key is valid
  const keyRecord = await kvGet(`key:${body.key}`);
  if (!keyRecord || !keyRecord.active) {
    return res.status(200).json({ stored: false, reason: 'Invalid key' });
  }

  // Anonymize: hash the key to create agent_id
  const agentId = createHash('sha256').update(body.key).digest('hex').slice(0, 12);

  const signal = {
    agent_id: agentId,
    tier: keyRecord.tier,
    tool: body.tool || 'unknown',
    regime: body.regime || null,
    posture: body.posture || null,
    risk_score: body.risk_score ?? null,
    opportunity_score: body.opportunity_score ?? null,
    fear_greed: body.fear_greed ?? null,
    timestamp: new Date().toISOString(),
  };

  // Store signal
  await kvLpush('signals', signal);
  // Keep only last N signals
  await kvLtrim('signals', 0, MAX_SIGNALS - 1);

  return res.status(200).json({ stored: true });
}
