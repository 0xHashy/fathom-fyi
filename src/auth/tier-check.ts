import type { ApiTier, TierConfig, TierViolation } from '../types/index.js';

const FREE_TOOLS = ['get_reality_check', 'get_market_regime', 'get_sentiment_state'];
const ALL_TOOLS = [
  'get_reality_check', 'get_market_regime', 'get_sentiment_state',
  'get_narrative_pulse', 'get_asset_context', 'get_temporal_context',
  'get_defi_health', 'get_macro_context', 'get_onchain_pulse',
];

const TIER_CONFIGS: Record<ApiTier, TierConfig> = {
  free: {
    tools: FREE_TOOLS,
    rateLimit: 10,
    cacheTtlMultiplier: 1,
    webhooks: false,
  },
  starter: {
    tools: ALL_TOOLS,
    rateLimit: 500,
    cacheTtlMultiplier: 1,
    webhooks: false,
  },
  pro: {
    tools: ALL_TOOLS,
    rateLimit: 2000,
    cacheTtlMultiplier: 0.5,
    webhooks: false,
  },
  trading_bot: {
    tools: ALL_TOOLS,
    rateLimit: -1,
    cacheTtlMultiplier: 0.25,
    webhooks: true,
  },
};

// Simple in-memory rate limiter
const requestCounts = new Map<string, { count: number; windowStart: number }>();

function getCurrentTier(): ApiTier {
  const tier = process.env.API_TIER ?? 'free';
  if (tier in TIER_CONFIGS) return tier as ApiTier;
  return 'free';
}

export function getTierConfig(): TierConfig {
  return TIER_CONFIGS[getCurrentTier()];
}

export function checkToolAccess(toolName: string): TierViolation | null {
  const config = getTierConfig();
  if (config.tools.includes(toolName)) return null;

  return {
    error: 'upgrade_required',
    message: `This tool requires Fathom Starter or above. Current tier: ${getCurrentTier()}.`,
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
