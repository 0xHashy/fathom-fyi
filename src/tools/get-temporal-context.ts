import type { TemporalContextOutput, ErrorOutput } from '../types/index.js';
import { CacheService } from '../cache/cache-service.js';
import { getCacheTtl } from '../auth/tier-check.js';
import { getTemporalCycleInfo, getCycleAnalogs } from '../intelligence/cycle-analyzer.js';

const CACHE_KEY = 'temporal_context';
const BASE_TTL = 3600;

export async function getTemporalContext(cache: CacheService): Promise<TemporalContextOutput | ErrorOutput> {
  const cached = cache.get<TemporalContextOutput>(CACHE_KEY);
  if (cached) return cached.data;

  try {
    const cycleInfo = getTemporalCycleInfo();
    const analogs = getCycleAnalogs(cycleInfo.daysSinceLastHalving);
    const guidance = generateTemporalGuidance(cycleInfo.estimatedCyclePhase, cycleInfo.daysSinceLastHalving, cycleInfo.cycleProgressPercentage);

    const durationRemaining = estimateTypicalDuration(cycleInfo.estimatedCyclePhase, cycleInfo.daysSinceLastHalving);

    const result: TemporalContextOutput = {
      current_date: new Date().toISOString().split('T')[0],
      last_halving_date: cycleInfo.lastHalvingDate,
      next_halving_estimated: cycleInfo.nextHalvingEstimated,
      days_since_last_halving: cycleInfo.daysSinceLastHalving,
      days_until_next_halving: cycleInfo.daysUntilNextHalving,
      cycle_progress_percentage: cycleInfo.cycleProgressPercentage,
      estimated_cycle_phase: cycleInfo.estimatedCyclePhase,
      phase_confidence: cycleInfo.phaseConfidence,
      historical_pattern: analogs.historicalPattern,
      cycle_1_analog: analogs.cycle1,
      cycle_2_analog: analogs.cycle2,
      cycle_3_analog: analogs.cycle3,
      typical_duration_remaining: durationRemaining,
      agent_guidance: guidance,
    };

    cache.set(CACHE_KEY, result, getCacheTtl(BASE_TTL));
    return result;
  } catch (err) {
    return {
      error: true,
      error_source: 'get_temporal_context',
      agent_guidance: 'Temporal cycle data unavailable. Bitcoin cycle positioning is a critical context layer — delay strategic positioning decisions until this data is restored.',
      last_known_data: cache.get<TemporalContextOutput>(CACHE_KEY)?.data ?? null,
      data_warnings: ['Temporal context temporarily unavailable. Retry shortly.'],
    };
  }
}

function estimateTypicalDuration(phase: string, daysSince: number): string {
  const phaseBounds: Record<string, [number, number]> = {
    'accumulation': [0, 180],
    'early_bull': [180, 365],
    'mid_bull': [365, 548],
    'late_bull': [548, 730],
    'early_bear': [730, 912],
    'mid_bear': [912, 1095],
    'late_bear': [1095, 1460],
  };

  const bounds = phaseBounds[phase];
  if (!bounds) return 'Unknown — cycle positioning uncertain.';

  const daysRemaining = bounds[1] - daysSince;
  if (daysRemaining <= 0) return 'Current phase may be transitioning — watch for confirmation signals.';

  const months = Math.round(daysRemaining / 30);
  return `Approximately ${daysRemaining} days (~${months} months) remaining in ${phase.replace('_', ' ')} phase based on historical cycle averages.`;
}

function generateTemporalGuidance(phase: string, daysSince: number, progress: number): string {
  const guidance: Record<string, string> = {
    'accumulation': `Bitcoin is ${daysSince} days post-halving (${progress}% through cycle). Cycle position: accumulation. Historically the lowest-risk entry zone. Prior cycles saw 3-6 months of sideways/slow accumulation before the bull run ignited. Strategy: systematic accumulation of BTC and blue-chip crypto. Maximum patience. Do not chase.`,
    'early_bull': `Bitcoin is ${daysSince} days post-halving (${progress}% through cycle). Cycle position: early bull. The bull market is likely underway but the biggest moves are still ahead. Prior cycles saw 3-8x returns from this point. Strategy: build and hold core positions. Don't trade — accumulate. Pullbacks of 20-30% are normal and should be bought.`,
    'mid_bull': `Bitcoin is ${daysSince} days post-halving (${progress}% through cycle). Cycle position: mid bull. Historically the most explosive phase. Prior cycles saw the majority of gains in this window. Strategy: hold core positions with conviction. Begin setting profit-taking targets. Watch for parabolic moves as potential mid-cycle top signals.`,
    'late_bull': `Bitcoin is ${daysSince} days post-halving (${progress}% through cycle). Cycle position: late bull. WARNING: Historically, cycle tops occur 18-24 months post-halving. Risk is significantly elevated. Strategy: begin systematic profit-taking. Reduce position sizes. Set hard stop losses. Do not add leverage. The music could stop at any time.`,
    'early_bear': `Bitcoin is ${daysSince} days post-halving (${progress}% through cycle). Cycle position: early bear. Prior cycles show 60-70% drawdowns from peak during this window. Strategy: maximize stablecoin allocation. Do not buy dips — they are traps in early bear markets. Wait for capitulation signals before re-engaging.`,
    'mid_bear': `Bitcoin is ${daysSince} days post-halving (${progress}% through cycle). Cycle position: mid bear. Prior cycles show bottoming processes beginning in this window. Strategy: begin watchlist preparation. Small, systematic accumulation of BTC only. No altcoins. No leverage. Dollar-cost average weekly.`,
    'late_bear': `Bitcoin is ${daysSince} days post-halving (${progress}% through cycle). Cycle position: late bear. Historically, the best risk-adjusted entry zone of the entire 4-year cycle. Prior cycle bottoms occurred in this window. Strategy: aggressive but systematic accumulation. This is where generational wealth opportunities are created for those with liquidity and conviction.`,
  };

  return guidance[phase] ?? `Bitcoin is ${daysSince} days post-halving (${progress}% through cycle). Cycle phase uncertain. Proceed with moderate positioning.`;
}
