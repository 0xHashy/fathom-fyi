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
  if (!KV_URL || !KV_TOKEN) return res.status(200).json({ error: 'Crowd data not available' });

  const key = req.query.key;
  if (!key) return res.status(200).json({ error: 'API key required' });

  const keyRec = await kvGet(`key:${key}`);
  if (!keyRec || !keyRec.active) return res.status(200).json({ error: 'Invalid key' });
  if (keyRec.tier !== 'pro' && keyRec.tier !== 'trading_bot') {
    return res.status(200).json({ error: 'Requires Pro or Trading Bot tier' });
  }

  const cached = await kvGet('crowd:cache');
  if (cached && cached.computed_at) {
    const age = Date.now() - new Date(cached.computed_at).getTime();
    if (age < 300000) return res.status(200).json(cached);
  }

  const raw = await kvCommand('LRANGE', 'signals', 0, 999);
  const signals = (Array.isArray(raw) ? raw : []).map(s => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
  const cutoff = Date.now() - 86400000;
  const recent = signals.filter(s => new Date(s.timestamp).getTime() > cutoff);

  const agents = new Set(recent.map(s => s.agent_id));
  const pc = {};
  let rs = 0, rn = 0, os = 0, on = 0;

  for (const s of recent) {
    if (s.posture) pc[s.posture] = (pc[s.posture] || 0) + 1;
    if (s.risk_score != null) { rs += s.risk_score; rn++; }
    if (s.opportunity_score != null) { os += s.opportunity_score; on++; }
  }

  const tp = Object.values(pc).reduce((a, b) => a + b, 0);
  const pd = {};
  for (const [k, v] of Object.entries(pc)) pd[k] = tp > 0 ? Math.round(v / tp * 100) : 0;

  const top = Object.entries(pc).sort((a, b) => b[1] - a[1]);
  const cp = top[0]?.[0] || 'unknown';
  const topPct = tp > 0 ? (top[0]?.[1] || 0) / tp : 0;
  const cs = topPct > 0.75 ? 'strong' : topPct > 0.55 ? 'moderate' : topPct > 0.4 ? 'weak' : 'no_consensus';
  const ar = rn > 0 ? Math.round(rs / rn) : 50;
  const ao = on > 0 ? Math.round(os / on) : 50;
  const cf = ar > 70 ? 'panicking' : ar > 55 ? 'fearful' : ar > 40 ? 'cautious' : 'calm';

  const result = {
    total_agents_24h: agents.size, total_signals_24h: recent.length,
    posture_distribution: pd, consensus_posture: cp, consensus_strength: cs,
    avg_risk_score: ar, avg_opportunity_score: ao, crowd_fear_level: cf,
    data_sufficient: agents.size >= 3,
    agent_guidance: `${agents.size} agent${agents.size === 1 ? '' : 's'} active. ${cs === 'strong' ? `Strong consensus: ${cp}.` : `${cs} consensus toward ${cp}.`}`,
    computed_at: new Date().toISOString(),
  };

  await kvCommand('SET', 'crowd:cache', JSON.stringify(result), 'EX', 300);
  return res.status(200).json(result);
}
