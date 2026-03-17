#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { CacheService } from './cache/cache-service.js';
import { checkToolAccess, checkRateLimit } from './auth/tier-check.js';
import { getMarketRegime } from './tools/get-market-regime.js';
import { getSentimentState } from './tools/get-sentiment-state.js';
import { getNarrativePulse } from './tools/get-narrative-pulse.js';
import { getAssetContext } from './tools/get-asset-context.js';
import { getTemporalContext } from './tools/get-temporal-context.js';
import { getDefiHealth } from './tools/get-defi-health.js';
import { getMacroContext } from './tools/get-macro-context.js';
import { getOnchainPulse } from './tools/get-onchain-pulse.js';
import { getRealityCheck } from './tools/get-reality-check.js';

const cache = new CacheService(process.env.CACHE_ENABLED !== 'false');

const server = new McpServer({
  name: 'fathom',
  version: '1.0.0',
});

// Helper: check access + rate limit, return error JSON string or null
function gateTool(toolName: string): string | null {
  const tierViolation = checkToolAccess(toolName);
  if (tierViolation) return JSON.stringify(tierViolation, null, 2);

  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) {
    return JSON.stringify({
      error: 'rate_limit_exceeded',
      message: rateCheck.message,
      agent_guidance: 'Rate limit exceeded. Fathom recommends waiting before retrying. Consider upgrading your tier at https://fathom.fyi for higher limits.',
    }, null, 2);
  }

  return null;
}

// ─── Tool: get_market_regime ───
server.tool(
  'get_market_regime',
  'Classify the current crypto market regime (risk-on, risk-off, transitional, euphoric, capitulation) with confidence score, evidence, historical analog, and actionable agent guidance.',
  {},
  async () => {
    const gateError = gateTool('get_market_regime');
    if (gateError) return { content: [{ type: 'text' as const, text: gateError }] };

    const result = await getMarketRegime(cache);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  },
);

// ─── Tool: get_sentiment_state ───
server.tool(
  'get_sentiment_state',
  'Get the current crypto sentiment state including Fear & Greed Index, 7-day trend, contrarian signals, and whether extreme fear/greed opportunities are active.',
  {},
  async () => {
    const gateError = gateTool('get_sentiment_state');
    if (gateError) return { content: [{ type: 'text' as const, text: gateError }] };

    const result = await getSentimentState(cache);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  },
);

// ─── Tool: get_narrative_pulse ───
server.tool(
  'get_narrative_pulse',
  'Identify accelerating, decelerating, and emerging crypto narratives. Shows sector rotation, momentum scores, and narrative cycle phase for positioning.',
  {},
  async () => {
    const gateError = gateTool('get_narrative_pulse');
    if (gateError) return { content: [{ type: 'text' as const, text: gateError }] };

    const result = await getNarrativePulse(cache);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  },
);

// ─── Tool: get_asset_context ───
server.tool(
  'get_asset_context',
  'Get deep context on a specific crypto asset: cycle position, price trend, volume health, holder behavior, risk level, and positioning guidance. Pass asset name or symbol (e.g., "bitcoin", "btc", "ethereum", "sol").',
  { asset: z.string().describe('Asset name or symbol (e.g., "bitcoin", "btc", "ethereum", "sol")') },
  async ({ asset }) => {
    const gateError = gateTool('get_asset_context');
    if (gateError) return { content: [{ type: 'text' as const, text: gateError }] };

    const result = await getAssetContext(cache, asset);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  },
);

// ─── Tool: get_temporal_context ───
server.tool(
  'get_temporal_context',
  'Get Bitcoin halving cycle positioning: days since last halving, estimated cycle phase, historical analogs from cycles 1-3, and cycle-based guidance.',
  {},
  async () => {
    const gateError = gateTool('get_temporal_context');
    if (gateError) return { content: [{ type: 'text' as const, text: gateError }] };

    const result = await getTemporalContext(cache);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  },
);

// ─── Tool: get_defi_health ───
server.tool(
  'get_defi_health',
  'Assess DeFi ecosystem health: total TVL, TVL trends, top chains and protocols, health score, revenue trends, and ecosystem concentration risk.',
  {},
  async () => {
    const gateError = gateTool('get_defi_health');
    if (gateError) return { content: [{ type: 'text' as const, text: gateError }] };

    const result = await getDefiHealth(cache);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  },
);

// ─── Tool: get_macro_context ───
server.tool(
  'get_macro_context',
  'Get macro economic context for crypto: Federal Funds Rate, DXY (dollar strength), yield curve, recession probability, and net macro impact on crypto.',
  {},
  async () => {
    const gateError = gateTool('get_macro_context');
    if (gateError) return { content: [{ type: 'text' as const, text: gateError }] };

    const result = await getMacroContext(cache);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  },
);

// ─── Tool: get_onchain_pulse ───
server.tool(
  'get_onchain_pulse',
  'Get Bitcoin on-chain health: mempool congestion, fees, miner distribution, network security, mining economics, and activity levels.',
  {},
  async () => {
    const gateError = gateTool('get_onchain_pulse');
    if (gateError) return { content: [{ type: 'text' as const, text: gateError }] };

    const result = await getOnchainPulse(cache);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  },
);

// ─── Tool: get_reality_check (MASTER TOOL) ───
server.tool(
  'get_reality_check',
  'The master tool. Synthesizes ALL data sources into a unified financial reality briefing: executive summary, risk/opportunity scores, regime, cycle, DeFi, macro, sentiment, on-chain, narratives, suggested posture, key risks, and key opportunities. Call this before any financially consequential decision.',
  {},
  async () => {
    const gateError = gateTool('get_reality_check');
    if (gateError) return { content: [{ type: 'text' as const, text: gateError }] };

    const result = await getRealityCheck(cache);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  },
);

// ─── Start Server ───
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Fathom MCP server running on stdio');
}

main().catch((err) => {
  console.error('Fatal error starting Fathom:', err);
  process.exit(1);
});
