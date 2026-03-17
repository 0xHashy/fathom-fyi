import type { RealityCheckOutput, ErrorOutput, NarrativeEntry } from '../types/index.js';
import { CacheService } from '../cache/cache-service.js';
import { getCacheTtl } from '../auth/tier-check.js';
import { getMarketRegime } from './get-market-regime.js';
import { getTemporalContext } from './get-temporal-context.js';
import { getDefiHealth } from './get-defi-health.js';
import { getMacroContext } from './get-macro-context.js';
import { getSentimentState } from './get-sentiment-state.js';
import { getOnchainPulse } from './get-onchain-pulse.js';
import { getNarrativePulse } from './get-narrative-pulse.js';
import {
  calculateRiskScore,
  calculateOpportunityScore,
  getRiskEnvironment,
  getSuggestedPosture,
  generateExecutiveSummary,
  generateKeyRisks,
  generateKeyOpportunities,
} from '../intelligence/interpreter.js';

const CACHE_KEY = 'reality_check';
const BASE_TTL = 180;

export async function getRealityCheck(cache: CacheService): Promise<RealityCheckOutput | ErrorOutput> {
  const cached = cache.get<RealityCheckOutput>(CACHE_KEY);
  if (cached) return cached.data;

  const dataWarnings: string[] = [];
  const sourcesUsed: string[] = [];

  try {
    // Fetch all data in parallel
    const [regimeRes, cycleRes, defiRes, macroRes, sentimentRes, onchainRes, narrativeRes] = await Promise.all([
      getMarketRegime(cache),
      getTemporalContext(cache),
      getDefiHealth(cache),
      getMacroContext(cache),
      getSentimentState(cache),
      getOnchainPulse(cache),
      getNarrativePulse(cache),
    ]);

    // Check for partial failures
    const isError = (r: unknown): r is ErrorOutput => (r as ErrorOutput).error === true;

    if (isError(regimeRes)) { dataWarnings.push(...regimeRes.data_warnings); } else { sourcesUsed.push('CoinGecko', 'Alternative.me Fear & Greed'); }
    if (isError(cycleRes)) { dataWarnings.push(...cycleRes.data_warnings); } else { sourcesUsed.push('Bitcoin halving cycle data'); }
    if (isError(defiRes)) { dataWarnings.push(...defiRes.data_warnings); } else { sourcesUsed.push('DeFiLlama'); }
    if (isError(macroRes)) { dataWarnings.push(...macroRes.data_warnings); } else { sourcesUsed.push('FRED (Federal Reserve)'); }
    if (isError(sentimentRes)) { dataWarnings.push(...sentimentRes.data_warnings); } else { sourcesUsed.push('Alternative.me Fear & Greed (7-day)'); }
    if (isError(onchainRes)) { dataWarnings.push(...onchainRes.data_warnings); } else { sourcesUsed.push('Mempool.space'); }
    if (isError(narrativeRes)) { dataWarnings.push(...narrativeRes.data_warnings); } else { sourcesUsed.push('CoinGecko Categories & Trending'); }

    // Extract values with safe defaults
    const regime = isError(regimeRes) ? null : regimeRes;
    const cycle = isError(cycleRes) ? null : cycleRes;
    const defi = isError(defiRes) ? null : defiRes;
    const macro = isError(macroRes) ? null : macroRes;
    const sentiment = isError(sentimentRes) ? null : sentimentRes;
    const onchain = isError(onchainRes) ? null : onchainRes;
    const narrative = isError(narrativeRes) ? null : narrativeRes;

    // If regime and sentiment both failed, we can't compute anything meaningful
    if (!regime && !sentiment) {
      return {
        error: true,
        error_source: 'get_reality_check',
        agent_guidance: 'Critical data sources unavailable. Both market regime and sentiment data failed. Fathom cannot provide a reliable reality check. Delay all financially consequential decisions until data is restored.',
        last_known_data: cache.get<RealityCheckOutput>(CACHE_KEY)?.data ?? null,
        data_warnings: dataWarnings,
      };
    }

    const fearGreed = sentiment?.fear_greed_current ?? regime?.fear_greed_score ?? 50;
    const currentRegime = regime?.regime ?? 'transitional';
    const cyclePhase = cycle?.estimated_cycle_phase ?? 'mid_bull';
    const macroImpact = macro?.macro_crypto_impact ?? 'neutral';
    const defiTrend = defi?.tvl_trend ?? 'stable';
    const defiTvlChange7d = defi?.tvl_change_7d ?? 0;
    const yieldCurveInverted = macro?.yield_curve_state === 'inverted';
    const btcDominanceTrend = regime?.btc_dominance_trend ?? 'neutral';

    // Calculate scores
    const riskScore = calculateRiskScore({
      fearGreed,
      regime: currentRegime,
      macroImpact,
      defiTvlChange7d,
      yieldCurveInverted,
      cyclePhase,
      defiTrend,
    });

    const opportunityScore = calculateOpportunityScore(riskScore, fearGreed, currentRegime);
    const riskEnvironment = getRiskEnvironment(riskScore);
    const posture = getSuggestedPosture(riskScore);

    const executiveSummary = generateExecutiveSummary({
      regime: currentRegime,
      fearGreed,
      riskScore,
      cyclePhase,
      posture,
      macroImpact,
      defiTrend,
      btcDominanceTrend,
    });

    const keyRisks = generateKeyRisks({
      regime: currentRegime,
      fearGreed,
      cyclePhase,
      macroImpact,
      defiTrend,
      yieldCurveInverted,
    });

    const keyOpportunities = generateKeyOpportunities({
      regime: currentRegime,
      fearGreed,
      cyclePhase,
      macroImpact,
      defiTrend,
    });

    // Top narratives
    const topNarratives: NarrativeEntry[] = narrative?.accelerating ?? [];

    // Data freshness
    const now = new Date();
    const dataFreshness = `Data collected at ${now.toISOString()}. Cache TTLs range from 120s (asset data) to 14400s (macro data).`;

    // Agent guidance — the master guidance
    const agentGuidance = generateMasterGuidance(posture, riskScore, opportunityScore, keyRisks, keyOpportunities);

    // Build default objects for any failed sources
    const defaultRegime = regime ?? {
      regime: 'transitional' as const,
      confidence: 0,
      evidence: ['Regime data unavailable'],
      historical_analog: 'Unable to determine — data unavailable',
      fear_greed_score: 50,
      fear_greed_label: 'Neutral',
      btc_dominance: 0,
      btc_dominance_trend: 'neutral' as const,
      total_market_cap_usd: 0,
      market_cap_change_24h: 0,
      agent_guidance: 'Regime data unavailable. Proceed with caution.',
    };

    const defaultCycle = cycle ?? {
      current_date: now.toISOString().split('T')[0],
      last_halving_date: '2024-04-19',
      next_halving_estimated: '2028-04-01',
      days_since_last_halving: 0,
      days_until_next_halving: 0,
      cycle_progress_percentage: 0,
      estimated_cycle_phase: 'mid_bull' as const,
      phase_confidence: 0,
      historical_pattern: 'Cycle data unavailable',
      cycle_1_analog: 'Unavailable',
      cycle_2_analog: 'Unavailable',
      cycle_3_analog: 'Unavailable',
      typical_duration_remaining: 'Unknown',
      agent_guidance: 'Cycle data unavailable.',
    };

    const defaultDefi = defi ?? {
      total_tvl_usd: 0,
      tvl_change_24h: 0,
      tvl_change_7d: 0,
      tvl_trend: 'stable' as const,
      top_chains: [],
      top_protocols: [],
      defi_health_score: 50,
      protocol_revenue_trend: 'stable' as const,
      ecosystem_concentration: 'healthy' as const,
      agent_guidance: 'DeFi data unavailable.',
    };

    const defaultMacro = macro ?? {
      fed_funds_rate: 0,
      fed_funds_trend: 'holding' as const,
      dxy_value: 0,
      dxy_trend: 'stable' as const,
      yield_curve: 0,
      yield_curve_state: 'normal' as const,
      recession_probability: 'low' as const,
      macro_crypto_impact: 'neutral' as const,
      macro_summary: 'Macro data unavailable.',
      agent_guidance: 'Macro data unavailable.',
    };

    const defaultSentiment = sentiment ?? {
      fear_greed_current: 50,
      fear_greed_7d_ago: 50,
      fear_greed_trend: 'stable' as const,
      fear_greed_label: 'Neutral',
      sentiment_narrative: 'Sentiment data unavailable.',
      extreme_fear_opportunity: false,
      extreme_greed_warning: false,
      contrarian_signal: 'No signal — data unavailable.',
      agent_guidance: 'Sentiment data unavailable.',
    };

    const defaultOnchain = onchain ?? {
      block_height: 0,
      mempool_congestion: 'normal' as const,
      recommended_fee_sats: 0,
      miner_distribution: [],
      network_security: 'normal' as const,
      mining_economics: 'profitable' as const,
      onchain_activity: 'normal' as const,
      agent_guidance: 'On-chain data unavailable.',
    };

    const result: RealityCheckOutput = {
      timestamp: now.toISOString(),
      fathom_version: '1.0.0',
      executive_summary: executiveSummary,
      overall_risk_environment: riskEnvironment,
      risk_score: riskScore,
      opportunity_score: opportunityScore,
      regime: defaultRegime,
      cycle: defaultCycle,
      defi: defaultDefi,
      macro: defaultMacro,
      sentiment: defaultSentiment,
      onchain: defaultOnchain,
      top_narratives: topNarratives,
      agent_guidance: agentGuidance,
      suggested_posture: posture,
      key_risks: keyRisks,
      key_opportunities: keyOpportunities,
      data_freshness: dataFreshness,
      sources_used: [...new Set(sourcesUsed)],
      data_warnings: dataWarnings,
    };

    cache.set(CACHE_KEY, result, getCacheTtl(BASE_TTL));
    return result;
  } catch (err) {
    return {
      error: true,
      error_source: 'get_reality_check',
      agent_guidance: 'Reality check failed. Fathom recommends delaying all financially consequential decisions until the service is restored. Do not act on stale or incomplete data.',
      last_known_data: cache.get<RealityCheckOutput>(CACHE_KEY)?.data ?? null,
      data_warnings: ['Reality check service temporarily unavailable. Retry shortly.'],
    };
  }
}

function generateMasterGuidance(
  posture: string,
  riskScore: number,
  opportunityScore: number,
  risks: string[],
  opportunities: string[],
): string {
  let guidance = `FATHOM ASSESSMENT — Suggested posture: ${posture.toUpperCase()}. Risk: ${riskScore}/100. Opportunity: ${opportunityScore}/100.\n\n`;

  if (posture === 'aggressive') {
    guidance += 'Conditions support aggressive positioning. Risk is low across multiple indicators. Deploy capital with confidence but maintain core risk management (position sizing, stop losses). This is a favorable environment for building positions.\n\n';
  } else if (posture === 'moderate') {
    guidance += 'Conditions support moderate positioning. Some risk factors present but overall environment is constructive. Maintain positions with standard sizing. Selective new entries acceptable on pullbacks.\n\n';
  } else if (posture === 'defensive') {
    guidance += 'Defensive posture recommended. Multiple risk indicators are elevated. Reduce position sizes. Tighten stop losses. Avoid new leveraged positions. Increase stablecoin allocation.\n\n';
  } else {
    guidance += 'SIDELINE RECOMMENDED. Risk is critically elevated across multiple indicators. Preserve capital. Move to 70%+ stablecoins. Only BTC spot positions acceptable, and only in small size. Wait for risk score to drop below 50 before re-engaging.\n\n';
  }

  guidance += 'TOP RISKS: ' + risks.join(' | ') + '\n\n';
  guidance += 'TOP OPPORTUNITIES: ' + opportunities.join(' | ');

  return guidance;
}
