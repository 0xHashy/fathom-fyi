// Vercel Serverless Function: /api/verify
// Validates a FATHOM_API_KEY and returns the associated tier.
//
// Keys are stored in the FATHOM_KEYS Vercel env var as JSON:
// {"fathom_abc123": "starter", "fathom_def456": "pro", "fathom_ghi789": "trading_bot"}
//
// Request:  GET /api/verify?key=fathom_abc123
// Response: { "valid": true, "tier": "starter" }

export default function handler(req, res) {
  // CORS headers for MCP servers calling from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ valid: false, error: 'Method not allowed' });
  }

  const key = req.query.key;

  if (!key || typeof key !== 'string') {
    return res.status(200).json({
      valid: false,
      tier: 'free',
      message: 'No API key provided. Free tier active.',
    });
  }

  // Load keys from env var
  let keys = {};
  try {
    const raw = process.env.FATHOM_KEYS;
    if (raw) {
      keys = JSON.parse(raw);
    }
  } catch {
    return res.status(500).json({
      valid: false,
      tier: 'free',
      message: 'Key validation service error. Defaulting to free tier.',
    });
  }

  const tier = keys[key];

  if (tier) {
    return res.status(200).json({
      valid: true,
      tier,
      message: `Authenticated. ${tier} tier active.`,
    });
  }

  return res.status(200).json({
    valid: false,
    tier: 'free',
    message: 'Invalid API key. Free tier active. Get a valid key at https://fathom.fyi',
  });
}
