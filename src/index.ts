#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { CacheService } from './cache/cache-service.js';
import { checkToolAccess, checkRateLimit, verifyApiKey, getAccountStatus } from './auth/tier-check.js';
import { getMarketRegime } from './tools/get-market-regime.js';
import { getSentimentState } from './tools/get-sentiment-state.js';
import { getNarrativePulse } from './tools/get-narrative-pulse.js';
import { getAssetContext } from './tools/get-asset-context.js';
import { getTemporalContext } from './tools/get-temporal-context.js';
import { getDefiHealth } from './tools/get-defi-health.js';
import { getMacroContext } from './tools/get-macro-context.js';
import { getOnchainPulse } from './tools/get-onchain-pulse.js';
import { getRealityCheck } from './tools/get-reality-check.js';
import { setPortfolioContext } from './tools/set-portfolio-context.js';
import { getPortfolioAnalysis } from './tools/get-portfolio-analysis.js';
import { getCrowdIntel } from './tools/get-crowd-intelligence.js';
import { getSignalHistory } from './tools/get-signal-history.js';
import { setAlertTool } from './tools/set-alert.js';
import { getAlertsTool } from './tools/get-alerts.js';
import { getWatchlistReport } from './tools/get-watchlist-report.js';
import { evaluateStrategyTool } from './tools/evaluate-strategy.js';
import { setCustomStrategyTool } from './tools/set-custom-strategy.js';
import { getChainContext } from './tools/get-chain-context.js';
import { getHistoricalContext } from './tools/get-historical-context.js';
import { getAlternativeSignals } from './tools/get-alternative-signals.js';
import { setSignalPreferencesTool } from './tools/set-signal-preferences.js';
import { getDerivativesContext } from './tools/get-derivatives-context.js';
import { getStablecoinFlowsTool } from './tools/get-stablecoin-flows.js';
import { getCorrelationMatrixTool } from './tools/get-correlation-matrix.js';
import { rotateApiKey } from './tools/rotate-api-key.js';
import { registerWebhook, removeWebhook, listWebhooks } from './worker/webhook-manager.js';
import { initProxy } from './sources/proxy.js';
import { logSignal } from './storage/signal-logger.js';
import { startBackgroundWorker } from './worker/background-worker.js';

const cache = new CacheService(process.env.CACHE_ENABLED !== 'false');

const server = new McpServer({
  name: 'fathom',
  version: '4.2.0',
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

// Helper: wrap tool execution with signal logging
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeAndLog(
  toolName: string,
  inputParams: Record<string, unknown>,
  fn: () => any,
): Promise<string> {
  const startMs = performance.now();
  const result = await fn();
  const elapsedMs = Math.round(performance.now() - startMs);

  // Add response time to result
  const output = { ...result, response_time_ms: elapsedMs };

  // Log signal (non-blocking)
  try { logSignal(toolName, inputParams, output as Record<string, unknown>); } catch { /* never crash */ }

  return JSON.stringify(output, null, 2);
}

// ─── Tool: get_market_regime ───
server.tool(
  'get_market_regime',
  'Classify the current crypto market regime (risk-on, risk-off, transitional, euphoric, capitulation) with confidence score, evidence, historical analog, and actionable agent guidance.',
  {},
  async () => {
    const gateError = gateTool('get_market_regime');
    if (gateError) return { content: [{ type: 'text' as const, text: gateError }] };

    const text = await executeAndLog('get_market_regime', {}, () => getMarketRegime(cache));
    return { content: [{ type: 'text' as const, text }] };
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

    const text = await executeAndLog('get_sentiment_state', {}, () => getSentimentState(cache));
    return { content: [{ type: 'text' as const, text }] };
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

    const text = await executeAndLog('get_narrative_pulse', {}, () => getNarrativePulse(cache));
    return { content: [{ type: 'text' as const, text }] };
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

    const text = await executeAndLog('get_asset_context', { asset }, () => getAssetContext(cache, asset));
    return { content: [{ type: 'text' as const, text }] };
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

    const text = await executeAndLog('get_temporal_context', {}, () => getTemporalContext(cache));
    return { content: [{ type: 'text' as const, text }] };
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

    const text = await executeAndLog('get_defi_health', {}, () => getDefiHealth(cache));
    return { content: [{ type: 'text' as const, text }] };
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

    const text = await executeAndLog('get_macro_context', {}, () => getMacroContext(cache));
    return { content: [{ type: 'text' as const, text }] };
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

    const text = await executeAndLog('get_onchain_pulse', {}, () => getOnchainPulse(cache));
    return { content: [{ type: 'text' as const, text }] };
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

    const text = await executeAndLog('get_reality_check', {}, () => getRealityCheck(cache));
    return { content: [{ type: 'text' as const, text }] };
  },
);

// ─── Tool: set_portfolio_context ───
server.tool(
  'set_portfolio_context',
  'Save your portfolio holdings so Fathom can give personalized guidance. Pass an array of holdings with asset name and amount. Example: [{asset: "bitcoin", amount: 2}, {asset: "solana", amount: 50}, {asset: "usdc", amount: 10000}].',
  {
    holdings: z.array(z.object({
      asset: z.string().describe('Asset name or symbol (e.g., "bitcoin", "btc", "sol", "usdc")'),
      amount: z.number().describe('Amount held'),
      entry_price_usd: z.number().optional().describe('Optional: average entry price in USD'),
    })).describe('Array of portfolio holdings'),
  },
  async ({ holdings }) => {
    const gateError = gateTool('set_portfolio_context');
    if (gateError) return { content: [{ type: 'text' as const, text: gateError }] };

    const result = setPortfolioContext(holdings);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  },
);

// ─── Tool: get_portfolio_analysis ───
server.tool(
  'get_portfolio_analysis',
  'Get personalized portfolio analysis against current market conditions. Shows position values, allocation percentages, PnL, concentration risk, regime alignment, and specific rebalancing suggestions. Requires set_portfolio_context to be called first.',
  {},
  async () => {
    const gateError = gateTool('get_portfolio_analysis');
    if (gateError) return { content: [{ type: 'text' as const, text: gateError }] };

    const text = await executeAndLog('get_portfolio_analysis', {}, () => getPortfolioAnalysis(cache));
    return { content: [{ type: 'text' as const, text }] };
  },
);

// ─── Tool: get_crowd_intelligence ───
server.tool(
  'get_crowd_intelligence',
  '[BETA] See what other Fathom-connected agents are doing. Returns aggregate posture distribution, consensus strength, most-queried assets, and crowd fear levels. Signal quality scales with network size.',
  {},
  async () => {
    const gateError = gateTool('get_crowd_intelligence');
    if (gateError) return { content: [{ type: 'text' as const, text: gateError }] };

    const text = await executeAndLog('get_crowd_intelligence', {}, () => getCrowdIntel());
    return { content: [{ type: 'text' as const, text }] };
  },
);

// ─── Tool: get_signal_history ───
server.tool(
  'get_signal_history',
  '[BETA] View Fathom\'s signal log. Shows recent signals with their regimes, postures, and risk scores. Useful for tracking how conditions evolved over time. Accuracy scoring is under development.',
  {
    limit: z.number().optional().describe('Number of recent signals to return (default: 20)'),
  },
  async ({ limit }) => {
    const gateError = gateTool('get_signal_history');
    if (gateError) return { content: [{ type: 'text' as const, text: gateError }] };

    const text = await executeAndLog('get_signal_history', { limit }, () => getSignalHistory(limit ?? 20));
    return { content: [{ type: 'text' as const, text }] };
  },
);

// ─── Tool: set_alert ───
server.tool(
  'set_alert',
  'Set custom alerts that trigger when market conditions meet your thresholds. Example: [{field: "fear_greed", operator: "<", threshold: 20, label: "Extreme fear"}]. Call get_alerts to check which are triggered.',
  {
    alerts: z.array(z.object({
      field: z.string().describe('Condition field (fear_greed, risk_score, regime, posture, cycle_phase, tvl_change_7d, etc.)'),
      operator: z.string().describe('Comparison operator: <, >, <=, >=, ==, !='),
      threshold: z.union([z.string(), z.number()]).describe('Threshold value'),
      label: z.string().optional().describe('Human-readable label for this alert'),
    })).describe('Array of alert conditions'),
  },
  async ({ alerts }) => {
    const gateError = gateTool('set_alert');
    if (gateError) return { content: [{ type: 'text' as const, text: gateError }] };

    const result = setAlertTool(alerts);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  },
);

// ─── Tool: get_alerts ───
server.tool(
  'get_alerts',
  'Check which of your configured alerts are currently triggered. Evaluates all alert conditions against live market data.',
  {},
  async () => {
    const gateError = gateTool('get_alerts');
    if (gateError) return { content: [{ type: 'text' as const, text: gateError }] };

    const text = await executeAndLog('get_alerts', {}, () => getAlertsTool(cache));
    return { content: [{ type: 'text' as const, text }] };
  },
);

// ─── Tool: get_watchlist_report ───
server.tool(
  'get_watchlist_report',
  'Analyze multiple assets at once. Returns cycle position, risk level, and volume health for each. Detects state changes since last check. Max 10 assets.',
  {
    assets: z.array(z.string()).max(10).describe('Array of asset names/symbols, e.g. ["btc", "eth", "sol", "avax"]'),
  },
  async ({ assets }) => {
    const gateError = gateTool('get_watchlist_report');
    if (gateError) return { content: [{ type: 'text' as const, text: gateError }] };

    const text = await executeAndLog('get_watchlist_report', { assets }, () => getWatchlistReport(cache, assets));
    return { content: [{ type: 'text' as const, text }] };
  },
);

// ─── Tool: evaluate_strategy ───
server.tool(
  'evaluate_strategy',
  'Evaluate a trading strategy against current market conditions. Built-in strategies: conservative_dca, momentum_rider, macro_aligned, fear_accumulator, full_defensive. Also evaluates custom strategies created with set_custom_strategy.',
  {
    strategy: z.string().describe('Strategy name (e.g. "conservative_dca", "momentum_rider", "full_defensive", or a custom name)'),
  },
  async ({ strategy }) => {
    const gateError = gateTool('evaluate_strategy');
    if (gateError) return { content: [{ type: 'text' as const, text: gateError }] };

    const text = await executeAndLog('evaluate_strategy', { strategy }, () => evaluateStrategyTool(cache, strategy));
    return { content: [{ type: 'text' as const, text }] };
  },
);

// ─── Tool: set_custom_strategy ───
server.tool(
  'set_custom_strategy',
  'Create a custom trading strategy with your own conditions. Then use evaluate_strategy to test it against current market conditions.',
  {
    name: z.string().describe('Name for your strategy'),
    conditions: z.array(z.object({
      field: z.string().describe('Condition field (fear_greed, risk_score, regime, posture, etc.)'),
      operator: z.string().describe('Comparison operator: <, >, <=, >=, ==, !='),
      threshold: z.union([z.string(), z.number()]).describe('Threshold value'),
    })).describe('Array of conditions that must ALL be met'),
  },
  async ({ name, conditions }) => {
    const gateError = gateTool('set_custom_strategy');
    if (gateError) return { content: [{ type: 'text' as const, text: gateError }] };

    const result = setCustomStrategyTool({ name, conditions });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  },
);

// ─── Tool: get_chain_context ───
server.tool(
  'get_chain_context',
  'Get DeFi context for a specific blockchain: TVL, dominance, trend, top protocols, and whether the chain is gaining or losing market share. Supports: ethereum, solana, base, arbitrum, optimism, polygon, avalanche, bsc, tron, bitcoin.',
  {
    chain: z.string().describe('Chain name (e.g. "ethereum", "solana", "base", "arbitrum")'),
  },
  async ({ chain }) => {
    const gateError = gateTool('get_chain_context');
    if (gateError) return { content: [{ type: 'text' as const, text: gateError }] };

    const text = await executeAndLog('get_chain_context', { chain }, () => getChainContext(cache, chain));
    return { content: [{ type: 'text' as const, text }] };
  },
);

// ─── Tool: get_historical_context ───
server.tool(
  'get_historical_context',
  'Look up what market conditions were on a specific date. Returns regime, fear/greed, risk score, BTC price, and TVL from that date. Useful for comparing past conditions to current ones.',
  {
    date: z.string().describe('Date in ISO format, e.g. "2026-03-01" or "2025-12-15"'),
  },
  async ({ date }) => {
    const gateError = gateTool('get_historical_context');
    if (gateError) return { content: [{ type: 'text' as const, text: gateError }] };

    const text = await executeAndLog('get_historical_context', { date }, () => getHistoricalContext(cache, date));
    return { content: [{ type: 'text' as const, text }] };
  },
);

// ─── Tool: get_alternative_signals ───
server.tool(
  'get_alternative_signals',
  'Unconventional market signals that 99% of agents ignore. Weather in financial centers (sunshine effect), political cycle positioning (presidential year), seasonality patterns (sell in May, January effect, Santa Claus rally), and macro event calendar (FOMC, CPI, options expiry). Academically documented patterns most tools overlook.',
  {},
  async () => {
    const gateError = gateTool('get_alternative_signals');
    if (gateError) return { content: [{ type: 'text' as const, text: gateError }] };

    const text = await executeAndLog('get_alternative_signals', {}, () => getAlternativeSignals(cache));
    return { content: [{ type: 'text' as const, text }] };
  },
);

// ─── Tool: set_signal_preferences ───
server.tool(
  'set_signal_preferences',
  'Customize which signals feed into your reality check. Turn individual signal sources on or off. Regime and sentiment are always included. Preferences persist between sessions. Example: {weather: false, political_cycle: false} to disable those signals.',
  {
    cycle: z.boolean().optional().describe('Include Bitcoin halving cycle data (default: true)'),
    defi: z.boolean().optional().describe('Include DeFi TVL and health data (default: true)'),
    macro: z.boolean().optional().describe('Include Fed rates, DXY, yield curve (default: true)'),
    onchain: z.boolean().optional().describe('Include Bitcoin on-chain data (default: true)'),
    narratives: z.boolean().optional().describe('Include sector rotation and narrative data (default: true)'),
    weather: z.boolean().optional().describe('Include weather in financial centers (default: true)'),
    political_cycle: z.boolean().optional().describe('Include presidential cycle data (default: true)'),
    seasonality: z.boolean().optional().describe('Include monthly/seasonal patterns (default: true)'),
    macro_calendar: z.boolean().optional().describe('Include FOMC, CPI, options expiry dates (default: true)'),
  },
  async (params) => {
    const gateError = gateTool('set_signal_preferences');
    if (gateError) return { content: [{ type: 'text' as const, text: gateError }] };

    const result = setSignalPreferencesTool(params);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  },
);

// ─── Tool: get_account_status ───
server.tool(
  'get_account_status',
  'Check your Fathom account: current tier, requests used this hour, available and locked tools, cache freshness, and upgrade options. Available on all tiers including free.',
  {},
  async () => {
    const status = getAccountStatus();
    return { content: [{ type: 'text' as const, text: JSON.stringify(status, null, 2) }] };
  },
);

// ─── Tool: set_webhook ───
server.tool(
  'set_webhook',
  'Register a webhook that fires when market conditions meet your criteria. Fathom evaluates conditions every 60 seconds and POSTs a JSON payload to your URL when all conditions are met. Example: alert me at my bot URL when fear_greed < 20 and regime == capitulation. Available fields: fear_greed, risk_score, opportunity_score, regime, posture, cycle_phase, tvl_change_7d, defi_health, macro_impact, net_flow_signal, leverage_signal, btc_put_call, btc_sp500_correlation, macro_risk_appetite.',
  {
    url: z.string().url().describe('HTTPS URL to POST webhook payload to'),
    conditions: z.array(z.object({
      field: z.string().describe('Condition field (fear_greed, risk_score, regime, posture, net_flow_signal, leverage_signal, etc.)'),
      operator: z.enum(['<', '>', '<=', '>=', '==', '!=']).describe('Comparison operator'),
      threshold: z.union([z.string(), z.number()]).describe('Threshold value'),
    })).min(1).describe('Conditions that must ALL be true to trigger'),
    label: z.string().optional().describe('Human-readable label for this webhook'),
    cooldown_minutes: z.number().optional().describe('Minimum minutes between triggers (default: 60)'),
  },
  async ({ url, conditions, label, cooldown_minutes }) => {
    const gateError = gateTool('set_webhook');
    if (gateError) return { content: [{ type: 'text' as const, text: gateError }] };

    const webhook = await registerWebhook({
      url,
      conditions: conditions as { field: string; operator: '<' | '>' | '<=' | '>=' | '==' | '!='; threshold: string | number }[],
      label,
      cooldown_minutes: cooldown_minutes ?? 60,
    });

    return { content: [{ type: 'text' as const, text: JSON.stringify({
      status: 'registered',
      webhook_id: webhook.id,
      url: webhook.url,
      conditions: webhook.conditions,
      label: webhook.label,
      cooldown_minutes: webhook.cooldown_minutes,
      agent_guidance: `Webhook registered. Fathom will POST to ${webhook.url} when all conditions are met. Conditions are evaluated every 60 seconds. Cooldown: ${webhook.cooldown_minutes} minutes between triggers. Use manage_webhooks to list or remove webhooks.`,
    }, null, 2) }] };
  },
);

// ─── Tool: manage_webhooks ───
server.tool(
  'manage_webhooks',
  'List all registered webhooks or remove one by ID. Use action "list" to see all webhooks with their conditions, trigger counts, and last triggered time. Use action "remove" with a webhook_id to delete a webhook.',
  {
    action: z.enum(['list', 'remove']).describe('"list" to see all webhooks, "remove" to delete one'),
    webhook_id: z.string().optional().describe('Webhook ID to remove (required for action "remove")'),
  },
  async ({ action, webhook_id }) => {
    const gateError = gateTool('manage_webhooks');
    if (gateError) return { content: [{ type: 'text' as const, text: gateError }] };

    if (action === 'list') {
      const hooks = await listWebhooks();
      return { content: [{ type: 'text' as const, text: JSON.stringify({
        webhooks: hooks.map(h => ({
          id: h.id,
          url: h.url,
          label: h.label,
          conditions: h.conditions,
          cooldown_minutes: h.cooldown_minutes,
          trigger_count: h.trigger_count,
          last_triggered: h.last_triggered ?? 'never',
          created_at: h.created_at,
        })),
        count: hooks.length,
        agent_guidance: hooks.length === 0
          ? 'No webhooks registered. Use set_webhook to create one.'
          : `${hooks.length} webhook(s) active. Total triggers: ${hooks.reduce((s, h) => s + h.trigger_count, 0)}.`,
      }, null, 2) }] };
    }

    if (action === 'remove') {
      if (!webhook_id) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: 'webhook_id is required for remove action' }) }] };
      }
      const removed = await removeWebhook(webhook_id);
      return { content: [{ type: 'text' as const, text: JSON.stringify({
        status: removed ? 'removed' : 'not_found',
        webhook_id,
        agent_guidance: removed ? 'Webhook removed. It will no longer fire.' : 'Webhook ID not found. Use manage_webhooks with action "list" to see active webhooks.',
      }, null, 2) }] };
    }

    return { content: [{ type: 'text' as const, text: '{"error": "Invalid action"}' }] };
  },
);

// ─── Tool: get_derivatives_context ───
server.tool(
  'get_derivatives_context',
  'Derivatives intelligence: perpetual funding rates (BTC/ETH/SOL), options data (put/call ratio, open interest, implied volatility, max pain price), and leverage positioning. Critical for understanding market positioning and liquidation risk. Data from Deribit.',
  {},
  async () => {
    const gateError = gateTool('get_derivatives_context');
    if (gateError) return { content: [{ type: 'text' as const, text: gateError }] };

    const text = await executeAndLog('get_derivatives_context', {}, () => getDerivativesContext(cache));
    return { content: [{ type: 'text' as const, text }] };
  },
);

// ─── Tool: get_stablecoin_flows ───
server.tool(
  'get_stablecoin_flows',
  'Track stablecoin supply changes across USDT, USDC, and all major stablecoins. Shows total supply, 24h/7d/30d minting and redemptions, net capital flow signal, depeg warnings, and liquidity assessment. Stablecoin flows are a leading indicator of capital entering or leaving crypto.',
  {},
  async () => {
    const gateError = gateTool('get_stablecoin_flows');
    if (gateError) return { content: [{ type: 'text' as const, text: gateError }] };

    const text = await executeAndLog('get_stablecoin_flows', {}, () => getStablecoinFlowsTool(cache));
    return { content: [{ type: 'text' as const, text }] };
  },
);

// ─── Tool: get_correlation_matrix ───
server.tool(
  'get_correlation_matrix',
  'BTC correlation with traditional finance: 30-day Pearson correlation with S&P 500 and Gold, plus current TradFi prices. Shows whether BTC is trading as a risk asset, safe haven, or independently. Critical for understanding macro spillover risk.',
  {},
  async () => {
    const gateError = gateTool('get_correlation_matrix');
    if (gateError) return { content: [{ type: 'text' as const, text: gateError }] };

    const text = await executeAndLog('get_correlation_matrix', {}, () => getCorrelationMatrixTool(cache));
    return { content: [{ type: 'text' as const, text }] };
  },
);

// ─── Tool: rotate_api_key ───
server.tool(
  'rotate_api_key',
  'Rotate your Fathom API key. Generates a new key, deactivates the old one, and returns the new key. The user must update their MCP config with the new key. Max 3 rotations per day. Requires Starter tier or above.',
  {},
  async () => {
    const gateError = gateTool('rotate_api_key');
    if (gateError) return { content: [{ type: 'text' as const, text: gateError }] };

    const text = await executeAndLog('rotate_api_key', {}, () => rotateApiKey());
    return { content: [{ type: 'text' as const, text }] };
  },
);

// ─── Start Server ───
async function main() {
  // Initialize data proxy routing (paid tiers use server-side data)
  initProxy();

  // Verify API key against fathom.fyi before accepting requests
  await verifyApiKey();

  // Start background worker to pre-compute data
  startBackgroundWorker(cache);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Fathom MCP server v4.4.0 running on stdio — 29 tools, 8 sources');
}

main().catch((err) => {
  console.error('Fatal error starting Fathom:', err);
  process.exit(1);
});
