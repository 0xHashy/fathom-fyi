// GET /api/crowd?key=fathom_sk_xxx
// Returns aggregated crowd intelligence from all Fathom-connected agents.
// Requires Pro+ tier API key.

import { kvGet, kvLrange, kvSet, isKvConfigured } from './_lib/kv.js';

const CACHE_TTL = 300; // 5 minutes

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const key = req.query.key;
  if (!key) {
    return res.status(200).json({ error: 'API key required for crowd intelligence' });
  }

  // Verify key and check tier
  if (isKvConfigured()) {
    const keyRecord = await kvGet(`key:${key}`);
    if (!keyRecord || !keyRecord.active) {
      return res.status(200).json({ error: 'Invalid or inactive API key' });
    }
    if (keyRecord.tier !== 'pro' && keyRecord.tier !== 'trading_bot') {
      return res.status(200).json({ error: 'Crowd intelligence requires Pro or Trading Bot tier' });
    }
  }

  // Check cache
  if (isKvConfigured()) {
    const cached = await kvGet('crowd:cache');
    if (cached && cached.computed_at) {
      const age = Date.now() - new Date(cached.computed_at).getTime();
      if (age < CACHE_TTL * 1000) {
        return res.status(200).json(cached);
      }
    }
  }

  // Compute crowd intelligence from recent signals
  if (!isKvConfigured()) {
    return res.status(200).json({ error: 'Crowd data not available' });
  }

  const signals = await kvLrange('signals', 0, 999);
  const cutoff = Date.now() - 24 * 3600_000;
  const recent = signals.filter(s => new Date(s.timestamp).getTime() > cutoff);

  const agents = new Set(recent.map(s => s.agent_id));

  // Posture distribution
  const postureCounts = {};
  const regimeCounts = {};
  let riskSum = 0, riskCount = 0;
  let oppSum = 0, oppCount = 0;

  for (const s of recent) {
    if (s.posture) postureCounts[s.posture] = (postureCounts[s.posture] || 0) + 1;
    if (s.regime) regimeCounts[s.regime] = (regimeCounts[s.regime] || 0) + 1;
    if (s.risk_score != null) { riskSum += s.risk_score; riskCount++; }
    if (s.opportunity_score != null) { oppSum += s.opportunity_score; oppCount++; }
  }

  const totalPosture = Object.values(postureCounts).reduce((a, b) => a + b, 0);
  const postureDistribution = {};
  for (const [k, v] of Object.entries(postureCounts)) {
    postureDistribution[k] = totalPosture > 0 ? Math.round((v / totalPosture) * 100) : 0;
  }

  const topPosture = Object.entries(postureCounts).sort((a, b) => b[1] - a[1]);
  const consensusPosture = topPosture[0]?.[0] || 'unknown';
  const topPct = totalPosture > 0 ? (topPosture[0]?.[1] || 0) / totalPosture : 0;

  let consensusStrength = 'no_consensus';
  if (topPct > 0.75) consensusStrength = 'strong';
  else if (topPct > 0.55) consensusStrength = 'moderate';
  else if (topPct > 0.4) consensusStrength = 'weak';

  const avgRisk = riskCount > 0 ? Math.round(riskSum / riskCount) : 50;
  const avgOpp = oppCount > 0 ? Math.round(oppSum / oppCount) : 50;
  const dataSufficient = agents.size >= 3;

  let crowdFear = 'calm';
  if (avgRisk > 70) crowdFear = 'panicking';
  else if (avgRisk > 55) crowdFear = 'fearful';
  else if (avgRisk > 40) crowdFear = 'cautious';

  let guidance = `${agents.size} agent${agents.size === 1 ? '' : 's'} active in last 24h. `;
  if (!dataSufficient) {
    guidance += `Crowd data is limited. Consensus signals are unreliable below 3 agents.`;
  } else if (consensusStrength === 'strong') {
    guidance += `Strong consensus: ${consensusPosture} posture (>75% agreement).`;
  } else {
    guidance += `${consensusStrength} consensus toward ${consensusPosture}.`;
  }

  const result = {
    total_agents_24h: agents.size,
    total_signals_24h: recent.length,
    posture_distribution: postureDistribution,
    consensus_posture: consensusPosture,
    consensus_strength: consensusStrength,
    avg_risk_score: avgRisk,
    avg_opportunity_score: avgOpp,
    crowd_fear_level: crowdFear,
    data_sufficient: dataSufficient,
    agent_guidance: guidance,
    computed_at: new Date().toISOString(),
  };

  // Cache the result
  await kvSet('crowd:cache', result, CACHE_TTL);

  return res.status(200).json(result);
}
