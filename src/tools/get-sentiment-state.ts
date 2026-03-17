import type { SentimentStateOutput, ErrorOutput } from '../types/index.js';
import { CacheService } from '../cache/cache-service.js';
import { getCacheTtl } from '../auth/tier-check.js';
import { getFearGreed, getFearGreedLabel } from '../sources/feargreed.js';

const CACHE_KEY = 'sentiment_state';
const BASE_TTL = 300;

export async function getSentimentState(cache: CacheService): Promise<SentimentStateOutput | ErrorOutput> {
  const cached = cache.get<SentimentStateOutput>(CACHE_KEY);
  if (cached) return cached.data;

  try {
    const fgData = await getFearGreed(7);
    const entries = fgData.data;

    const current = parseInt(entries[0].value, 10);
    const sevenDayAgo = entries.length >= 7 ? parseInt(entries[6].value, 10) : parseInt(entries[entries.length - 1].value, 10);

    const diff = current - sevenDayAgo;
    const trend: 'improving' | 'stable' | 'deteriorating' =
      diff > 5 ? 'improving' : diff < -5 ? 'deteriorating' : 'stable';

    const extremeFearOpportunity = current < 20;
    const extremeGreedWarning = current > 80;

    const contrarianSignal = current < 20
      ? 'Historically strong accumulation signal. Extreme fear often precedes recovery. Prior instances (March 2020, June 2022, November 2022) preceded 50-300% rallies within 3-12 months.'
      : current > 80
        ? 'Historically strong distribution signal. Extreme greed often precedes correction. Prior instances (November 2021, March 2024) preceded 20-50% drawdowns within 1-3 months.'
        : `Sentiment at ${current} is in the neutral-to-${current > 50 ? 'greedy' : 'fearful'} range. No extreme contrarian signal active. Monitor for moves toward extremes.`;

    const narrative = generateSentimentNarrative(current, sevenDayAgo, trend);
    const guidance = generateSentimentGuidance(current, trend, extremeFearOpportunity, extremeGreedWarning);

    const result: SentimentStateOutput = {
      fear_greed_current: current,
      fear_greed_7d_ago: sevenDayAgo,
      fear_greed_trend: trend,
      fear_greed_label: getFearGreedLabel(current),
      sentiment_narrative: narrative,
      extreme_fear_opportunity: extremeFearOpportunity,
      extreme_greed_warning: extremeGreedWarning,
      contrarian_signal: contrarianSignal,
      agent_guidance: guidance,
    };

    cache.set(CACHE_KEY, result, getCacheTtl(BASE_TTL));
    return result;
  } catch (err) {
    return {
      error: true,
      error_source: 'get_sentiment_state',
      agent_guidance: 'Sentiment data unavailable. Without sentiment context, treat current conditions as uncertain. Reduce position sizes until sentiment data is restored.',
      last_known_data: cache.get<SentimentStateOutput>(CACHE_KEY)?.data ?? null,
      data_warnings: [`Failed to fetch sentiment data: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}

function generateSentimentNarrative(current: number, sevenDayAgo: number, trend: string): string {
  const direction = trend === 'improving' ? 'recovering' : trend === 'deteriorating' ? 'declining' : 'stable';
  const label = getFearGreedLabel(current);

  if (current < 20) {
    return `Crypto market sentiment is at Extreme Fear (${current}/100), ${direction} from ${sevenDayAgo} a week ago. The crowd is in panic mode. Historically, extreme fear has been a reliable contrarian indicator — the market is pricing in maximum pessimism. This is when long-term buyers historically begin accumulating.`;
  }
  if (current < 40) {
    return `Crypto market sentiment is in Fear territory (${current}/100), ${direction} from ${sevenDayAgo} a week ago. Risk appetite is depressed but not at capitulation levels. Market participants are cautious. This zone has historically offered better entry points than neutral or greed zones, though timing the exact bottom remains difficult.`;
  }
  if (current <= 60) {
    return `Crypto market sentiment is Neutral (${current}/100), ${direction} from ${sevenDayAgo} a week ago. The market is at an inflection point — sentiment is neither fearful nor greedy. Direction will likely be determined by the next major catalyst. Watch for breakout above 60 (risk-on signal) or breakdown below 40 (risk-off signal).`;
  }
  if (current <= 80) {
    return `Crypto market sentiment is in Greed territory (${current}/100), ${direction} from ${sevenDayAgo} a week ago. Risk appetite is elevated. The market is optimistic but not yet irrational. Conditions support continued upside but ${label} historically transitions to Extreme Greed before major tops, or pulls back to Fear before the next leg up.`;
  }
  return `Crypto market sentiment is at Extreme Greed (${current}/100), ${direction} from ${sevenDayAgo} a week ago. The crowd is euphoric. Historically, readings above 80 have been followed by 20-50% corrections within 1-3 months in the majority of cases. Smart money typically distributes at these levels while retail FOMO peaks.`;
}

function generateSentimentGuidance(
  current: number,
  trend: string,
  extremeFear: boolean,
  extremeGreed: boolean,
): string {
  if (extremeFear) {
    return `Extreme Fear at ${current}/100 — contrarian accumulation signal is active. Begin systematic accumulation of high-conviction assets (BTC, ETH). Use dollar-cost averaging over 2-4 weeks rather than lump sum. Avoid leverage. Wait for Fear & Greed to cross above 25 before increasing size. Sentiment trend: ${trend}.`;
  }
  if (extremeGreed) {
    return `Extreme Greed at ${current}/100 — contrarian distribution signal is active. Take profits on 25-50% of speculative positions. Tighten stop losses on remaining positions. Do not initiate new leveraged longs. Do not FOMO into breakouts at these sentiment levels. Wait for pullback to Greed (60-75) before adding exposure. Sentiment trend: ${trend}.`;
  }
  if (current < 40) {
    return `Fear territory at ${current}/100 — approaching potential opportunity zone. Begin watchlist preparation for accumulation targets. Reduce position sizes on any new entries. Current sentiment trend: ${trend}. If Fear & Greed drops below 20, activate accumulation protocol.`;
  }
  if (current > 60) {
    return `Greed territory at ${current}/100 — conditions support risk-on positioning but caution is warranted. Maintain positions with trailing stops. Avoid chasing parabolic moves. Sentiment trend: ${trend}. If Fear & Greed exceeds 80, begin systematic profit-taking.`;
  }
  return `Neutral territory at ${current}/100 — no strong sentiment-based signal. Maintain current positioning. Sentiment trend: ${trend}. Wait for directional confirmation before adjusting exposure.`;
}
