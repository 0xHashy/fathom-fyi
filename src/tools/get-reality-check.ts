import type { RealityCheckOutput, ErrorOutput, NarrativeEntry } from '../types/index.js';
import { CacheService } from '../cache/cache-service.js';
import { getCacheTtl, getTierConfig } from '../auth/tier-check.js';
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
import { getFinancialCenterWeather } from '../sources/weather.js';
import {
  getPoliticalCycle,
  getSeasonality,
  getMacroCalendar,
  analyzeWeatherSentiment,
} from '../intelligence/alternative-signals.js';
import { getPreferences } from '../storage/preferences-store.js';
import { createHash } from 'crypto';

const AGENT_ID = process.env.FATHOM_AGENT_ID ??
  createHash('sha256').update(process.env.CG_API_KEY ?? 'anonymous').digest('hex').slice(0, 12);

const CACHE_KEY = 'reality_check';
const BASE_TTL = 180;

export async function getRealityCheck(cache: CacheService): Promise<RealityCheckOutput | ErrorOutput> {
  const cached = cache.get<RealityCheckOutput>(CACHE_KEY);
  if (cached) return cached.data;

  const dataWarnings: string[] = [];
  const sourcesUsed: string[] = [];

  try {
    // Check tier and preferences
    const isPaid = getTierConfig().tools.includes('get_alternative_signals');
    const prefs = getPreferences(AGENT_ID);

    // Fetch data in parallel (respecting preferences)
    const [regimeRes, cycleRes, defiRes, macroRes, sentimentRes, onchainRes, narrativeRes, weatherRes] = await Promise.all([
      getMarketRegime(cache), // always (regime + sentiment are core)
      prefs.cycle ? getTemporalContext(cache) : Promise.resolve(null),
      prefs.defi ? getDefiHealth(cache) : Promise.resolve(null),
      prefs.macro ? getMacroContext(cache) : Promise.resolve(null),
      getSentimentState(cache), // always
      prefs.onchain ? getOnchainPulse(cache) : Promise.resolve(null),
      prefs.narratives ? getNarrativePulse(cache) : Promise.resolve(null),
      isPaid && prefs.weather ? getFinancialCenterWeather().catch(() => []) : Promise.resolve([]),
    ]);

    // Compute alternative signals (only for paid tiers, respecting preferences)
    const weatherSentiment = isPaid && prefs.weather ? analyzeWeatherSentiment(weatherRes) : null;
    const politicalCycle = isPaid && prefs.political_cycle ? getPoliticalCycle() : null;
    const seasonality = isPaid && prefs.seasonality ? getSeasonality() : null;
    const macroCalendar = isPaid && prefs.macro_calendar ? getMacroCalendar() : null;

    // Check for partial failures (null = disabled by preference, ErrorOutput = API failure)
    const isError = (r: unknown): r is ErrorOutput => r !== null && (r as ErrorOutput).error === true;
    const isGood = (r: unknown): boolean => r !== null && !isError(r);

    if (isError(regimeRes)) { dataWarnings.push(...regimeRes.data_warnings); } else if (isGood(regimeRes)) { sourcesUsed.push('CoinGecko', 'Alternative.me Fear & Greed'); }
    if (isError(cycleRes)) { dataWarnings.push(...cycleRes.data_warnings); } else if (isGood(cycleRes)) { sourcesUsed.push('Bitcoin halving cycle data'); }
    if (isError(defiRes)) { dataWarnings.push(...defiRes.data_warnings); } else if (isGood(defiRes)) { sourcesUsed.push('DeFiLlama'); }
    if (isError(macroRes)) { dataWarnings.push(...macroRes.data_warnings); } else if (isGood(macroRes)) { sourcesUsed.push('FRED (Federal Reserve)'); }
    if (isError(sentimentRes)) { dataWarnings.push(...sentimentRes.data_warnings); } else if (isGood(sentimentRes)) { sourcesUsed.push('Alternative.me Fear & Greed (7-day)'); }
    if (isError(onchainRes)) { dataWarnings.push(...onchainRes.data_warnings); } else if (isGood(onchainRes)) { sourcesUsed.push('Mempool.space'); }
    if (isError(narrativeRes)) { dataWarnings.push(...narrativeRes.data_warnings); } else if (isGood(narrativeRes)) { sourcesUsed.push('CoinGecko Categories & Trending'); }

    // Extract values with safe defaults (null = disabled by preference or error)
    const regime = (regimeRes && !isError(regimeRes)) ? regimeRes : null;
    const cycle = (cycleRes && !isError(cycleRes)) ? cycleRes : null;
    const defi = (defiRes && !isError(defiRes)) ? defiRes : null;
    const macro = (macroRes && !isError(macroRes)) ? macroRes : null;
    const sentiment = (sentimentRes && !isError(sentimentRes)) ? sentimentRes : null;
    const onchain = (onchainRes && !isError(onchainRes)) ? onchainRes : null;
    const narrative = (narrativeRes && !isError(narrativeRes)) ? narrativeRes : null;

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

    // Build alternative signals summary (paid tiers only)
    const altBullish: string[] = [];
    const altBearish: string[] = [];
    let altBias = 'neutral';

    if (isPaid && weatherSentiment && politicalCycle && seasonality && macroCalendar) {
      if (weatherSentiment.weather_bias === 'positive') altBullish.push('Sunshine effect: majority of financial centers clear');
      if (weatherSentiment.weather_bias === 'negative') altBearish.push('Overcast effect: majority of financial centers grey');
      if (politicalCycle.term_year === 3) altBullish.push(`Presidential Year 3 — historically strongest`);
      if (politicalCycle.term_year === 1) altBearish.push('Presidential Year 1 — policy uncertainty');
      if (seasonality.monthly_bias === 'bullish') altBullish.push(`${seasonality.month}: historically bullish`);
      if (seasonality.monthly_bias === 'bearish') altBearish.push(`${seasonality.month}: historically bearish`);
      if (macroCalendar.calendar_risk === 'high') altBearish.push('Major macro event imminent');
      if (macroCalendar.next_options_expiry.days_until <= 3) altBearish.push('Options expiry approaching');
      for (const e of seasonality.active_effects) {
        if (e.includes('Best six months') || e.includes('Santa') || e.includes('January Effect')) altBullish.push(e);
        if (e.includes('Sell in May') || e.includes('Monday effect')) altBearish.push(e);
      }
      altBias = altBullish.length > altBearish.length + 1 ? 'bullish'
        : altBearish.length > altBullish.length + 1 ? 'bearish' : 'neutral';
      sourcesUsed.push('Open-Meteo (weather)', 'Political cycle data', 'Seasonality patterns');
    }

    const result: RealityCheckOutput = {
      timestamp: now.toISOString(),
      fathom_version: '3.1.0',
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
      alternative_signals: isPaid && weatherSentiment && politicalCycle && seasonality && macroCalendar ? {
        weather: weatherSentiment,
        political_cycle: politicalCycle,
        seasonality: { month: seasonality.month, bias: seasonality.monthly_bias, active_effects: seasonality.active_effects },
        macro_calendar: { next_fomc: macroCalendar.next_fomc, next_cpi: macroCalendar.next_cpi, next_options_expiry: macroCalendar.next_options_expiry, calendar_risk: macroCalendar.calendar_risk },
        composite_bias: altBias,
        bullish_signals: altBullish,
        bearish_signals: altBearish,
      } : undefined,
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
