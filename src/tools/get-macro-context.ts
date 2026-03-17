import type { MacroContextOutput, MacroCryptoImpact, RecessionProbability, ErrorOutput } from '../types/index.js';
import { CacheService } from '../cache/cache-service.js';
import { getCacheTtl } from '../auth/tier-check.js';
import { getMacroData } from '../sources/fred.js';

const CACHE_KEY = 'macro_context';
const BASE_TTL = 14400;

export async function getMacroContext(cache: CacheService): Promise<MacroContextOutput | ErrorOutput> {
  const cached = cache.get<MacroContextOutput>(CACHE_KEY);
  if (cached) return cached.data;

  try {
    const macro = await getMacroData();

    // Determine crypto impact
    const impact = determineCryptoImpact(macro.dxyTrend, macro.fedFundsTrend, macro.yieldCurveState);

    // Recession probability
    const recessionProb = determineRecessionProbability(macro.yieldCurveState, macro.fedFundsTrend);

    // Summary
    const summary = generateMacroSummary(macro, impact, recessionProb);
    const guidance = generateMacroGuidance(impact, recessionProb, macro.fedFundsTrend, macro.dxyTrend);

    const result: MacroContextOutput = {
      fed_funds_rate: macro.fedFundsRate ?? 0,
      fed_funds_trend: macro.fedFundsTrend,
      dxy_value: macro.dxyValue ?? 0,
      dxy_trend: macro.dxyTrend,
      yield_curve: macro.yieldCurve ?? 0,
      yield_curve_state: macro.yieldCurveState,
      recession_probability: recessionProb,
      macro_crypto_impact: impact,
      macro_summary: summary,
      agent_guidance: guidance,
    };

    cache.set(CACHE_KEY, result, getCacheTtl(BASE_TTL));
    return result;
  } catch (err) {
    return {
      error: true,
      error_source: 'get_macro_context',
      agent_guidance: 'Macro context unavailable (FRED API). Without macro backdrop, assume neutral-to-cautious conditions. Do not assume monetary policy is favorable — check manually before large allocations.',
      last_known_data: cache.get<MacroContextOutput>(CACHE_KEY)?.data ?? null,
      data_warnings: [`Failed to fetch macro data: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}

function determineCryptoImpact(
  dxy: string,
  fed: string,
  yieldCurve: string,
): MacroCryptoImpact {
  let score = 0; // positive = headwind, negative = tailwind

  if (dxy === 'strengthening') score += 2;
  if (dxy === 'weakening') score -= 2;

  if (fed === 'hiking') score += 2;
  if (fed === 'cutting') score -= 2;

  if (yieldCurve === 'inverted') score += 1;

  if (score >= 3) return 'strong_headwind';
  if (score >= 1) return 'headwind';
  if (score <= -2) return 'tailwind';
  return 'neutral';
}

function determineRecessionProbability(
  yieldCurve: string,
  fedTrend: string,
): RecessionProbability {
  if (yieldCurve === 'inverted' && fedTrend === 'hiking') return 'high';
  if (yieldCurve === 'inverted') return 'elevated';
  if (yieldCurve === 'flat' && fedTrend === 'hiking') return 'moderate';
  return 'low';
}

function generateMacroSummary(
  macro: { fedFundsRate: number | null; fedFundsTrend: string; dxyValue: number | null; dxyTrend: string; yieldCurve: number | null; yieldCurveState: string },
  impact: string,
  recession: string,
): string {
  const fedStr = macro.fedFundsRate !== null ? `${macro.fedFundsRate.toFixed(2)}%` : 'unavailable';
  const dxyStr = macro.dxyValue !== null ? `${macro.dxyValue.toFixed(2)}` : 'unavailable';
  const yieldStr = macro.yieldCurve !== null ? `${macro.yieldCurve.toFixed(2)}%` : 'unavailable';

  return `Federal Funds Rate: ${fedStr} (${macro.fedFundsTrend}). US Dollar Index proxy: ${dxyStr} (${macro.dxyTrend}). 10Y-2Y spread: ${yieldStr} (${macro.yieldCurveState}). Recession probability: ${recession}. Net crypto impact: ${impact}.`;
}

function generateMacroGuidance(
  impact: MacroCryptoImpact,
  recession: RecessionProbability,
  fedTrend: string,
  dxyTrend: string,
): string {
  const base: Record<MacroCryptoImpact, string> = {
    'tailwind': `Macro conditions are a tailwind for crypto. ${fedTrend === 'cutting' ? 'Rate cuts are expanding liquidity — historically the strongest macro catalyst for risk assets.' : ''} ${dxyTrend === 'weakening' ? 'Weakening dollar typically drives capital into alternative stores of value including crypto.' : ''} Macro supports aggressive positioning in crypto.`,
    'neutral': `Macro conditions are neutral for crypto. Neither monetary policy nor dollar strength is providing a clear directional signal. Crypto will be driven primarily by internal market dynamics, narratives, and cycle positioning rather than macro factors.`,
    'headwind': `Macro conditions present a headwind. ${fedTrend === 'hiking' ? 'Rate hikes are tightening liquidity — historically negative for risk assets.' : ''} ${dxyTrend === 'strengthening' ? 'Strengthening dollar competes with crypto for capital flows.' : ''} Reduce position sizes by 20-30% compared to neutral macro conditions. Favor BTC over altcoins.`,
    'strong_headwind': `Macro conditions are a significant headwind. ${fedTrend === 'hiking' ? 'Active rate hiking cycle is draining liquidity from risk assets.' : ''} ${dxyTrend === 'strengthening' ? 'Strong dollar is a direct headwind.' : ''} Recession probability: ${recession}. Defensive posture required. Minimize altcoin exposure. Maximum 30% crypto allocation. Hold significant stablecoin reserves.`,
  };

  return base[impact];
}
