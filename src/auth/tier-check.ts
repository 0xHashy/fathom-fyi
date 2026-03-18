import type { ApiTier, TierConfig, TierViolation } from '../types/index.js';

const FREE_TOOLS = ['get_reality_check', 'get_market_regime', 'get_sentiment_state'];
const STARTER_TOOLS = [
  'get_reality_check', 'get_market_regime', 'get_sentiment_state',
  'get_narrative_pulse', 'get_asset_context', 'get_temporal_context',
  'get_defi_health', 'get_macro_context', 'get_onchain_pulse',
  'set_portfolio_context',
  'set_alert', 'get_alerts',
  'get_watchlist_report',
  'evaluate_strategy',
  'get_chain_context',
  'get_alternative_signals',
  'set_signal_preferences',
  'get_derivatives_context',
  'get_stablecoin_flows',
  'get_correlation_matrix',
];

const PRO_TOOLS = [
  ...STARTER_TOOLS,
  'get_portfolio_analysis', 'get_crowd_intelligence', 'get_signal_history',
  'get_historical_context', 'set_custom_strategy',
];

const ALL_TOOLS = PRO_TOOLS;

const TIER_CONFIGS: Record<ApiTier, TierConfig> = {
  free: {
    tools: FREE_TOOLS,
    rateLimit: 10,
    cacheTtlMultiplier: 1,
  },
  starter: {
    tools: STARTER_TOOLS,
    rateLimit: 500,
    cacheTtlMultiplier: 1,
  },
  pro: {
    tools: PRO_TOOLS,
    rateLimit: 2000,
    cacheTtlMultiplier: 0.5,
  },
  unlimited: {
    tools: PRO_TOOLS,
    rateLimit: -1,
    cacheTtlMultiplier: 0.25,
  },
};

// ─── Server-validated tier ───
// On startup, the server phones home to fathom.fyi/api/verify
// to validate the API key and get the real tier.
// Falls back to free if no key, invalid key, or network error.

let verifiedTier: ApiTier = 'free';
let tierVerified = false;

export async function verifyApiKey(): Promise<void> {
  const apiKey = process.env.FATHOM_API_KEY;

  if (!apiKey) {
    verifiedTier = 'free';
    tierVerified = true;
    console.error('Fathom: No API key provided. Free tier active (3 tools, 10 req/hr).');
    return;
  }

  try {
    const res = await fetch(
      `https://fathom.fyi/api/verify?key=${encodeURIComponent(apiKey)}`,
      { signal: AbortSignal.timeout(5000) },
    );

    if (res.ok) {
      const data = await res.json() as { valid: boolean; tier: string; message?: string };
      if (data.valid && data.tier in TIER_CONFIGS) {
        verifiedTier = data.tier as ApiTier;
        console.error(`Fathom: API key verified. ${verifiedTier} tier active.`);
      } else {
        verifiedTier = 'free';
        console.error(`Fathom: Invalid API key. Free tier active. Get a key at https://fathom.fyi`);
      }
    } else {
      verifiedTier = 'free';
      console.error('Fathom: Key verification unavailable. Free tier active.');
    }
  } catch {
    // Network error, timeout, offline — fall back to free
    verifiedTier = 'free';
    console.error('Fathom: Key verification unreachable. Free tier active.');
  }

  tierVerified = true;
}

function getCurrentTier(): ApiTier {
  // If verified via phone-home, use that
  if (tierVerified) return verifiedTier;

  // Fallback during startup before verification completes
  return 'free';
}

// Simple in-memory rate limiter
const requestCounts = new Map<string, { count: number; windowStart: number }>();

export function getTierConfig(): TierConfig {
  return TIER_CONFIGS[getCurrentTier()];
}

export function checkToolAccess(toolName: string): TierViolation | null {
  const config = getTierConfig();
  if (config.tools.includes(toolName)) return null;

  return {
    error: 'upgrade_required',
    message: `This tool requires Fathom ${getCurrentTier() === 'free' ? 'Starter' : 'Pro'} or above. Current tier: ${getCurrentTier()}.`,
    upgrade_url: 'https://fathom.fyi',
    available_on_free: FREE_TOOLS,
  };
}

export function checkRateLimit(clientId = 'default'): { allowed: boolean; message?: string } {
  const config = getTierConfig();
  if (config.rateLimit === -1) return { allowed: true };

  const now = Date.now();
  const hourMs = 3600_000;
  let entry = requestCounts.get(clientId);

  if (!entry || now - entry.windowStart > hourMs) {
    entry = { count: 0, windowStart: now };
    requestCounts.set(clientId, entry);
  }

  entry.count++;

  if (entry.count > config.rateLimit) {
    return {
      allowed: false,
      message: `Rate limit exceeded. ${getCurrentTier()} tier allows ${config.rateLimit} requests/hour. Upgrade at https://fathom.fyi`,
    };
  }

  return { allowed: true };
}

export function getCacheTtl(baseTtl: number): number {
  return Math.round(baseTtl * getTierConfig().cacheTtlMultiplier);
}
