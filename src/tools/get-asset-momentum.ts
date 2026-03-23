import type { ErrorOutput } from '../types/index.js';
import { CacheService } from '../cache/cache-service.js';
import { getCacheTtl } from '../auth/tier-check.js';
import { getMarketChart, resolveCoingeckoId } from '../sources/coingecko.js';

const BASE_TTL = 60;

interface MomentumOutput {
  asset: string;
  coingecko_id: string;
  timeframe: string;
  direction: 'strongly_bullish' | 'bullish' | 'neutral' | 'bearish' | 'strongly_bearish';
  strength: number; // 0-100
  confidence: number; // 0-100
  price_change_percent: number;
  price_start: number;
  price_current: number;
  volume_trend: 'increasing' | 'stable' | 'decreasing';
  momentum_score: number; // -100 to +100
  rsi_14: number;
  consecutive_direction: number; // how many periods in same direction
  agent_guidance: string;
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  const recentChanges = changes.slice(-period);
  let avgGain = 0;
  let avgLoss = 0;
  for (const change of recentChanges) {
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function getConsecutiveDirection(prices: number[]): { count: number; direction: string } {
  if (prices.length < 2) return { count: 0, direction: 'neutral' };
  let count = 0;
  const lastDirection = prices[prices.length - 1] > prices[prices.length - 2] ? 'up' : 'down';
  for (let i = prices.length - 1; i > 0; i--) {
    const dir = prices[i] > prices[i - 1] ? 'up' : 'down';
    if (dir === lastDirection) count++;
    else break;
  }
  return { count, direction: lastDirection };
}

export async function getAssetMomentum(
  cache: CacheService,
  asset: string,
  timeframe: string = '4h',
): Promise<MomentumOutput | ErrorOutput> {
  const coingeckoId = resolveCoingeckoId(asset);
  const cacheKey = `asset_momentum_${coingeckoId}_${timeframe}`;
  const cached = cache.get<MomentumOutput>(cacheKey);
  if (cached) return cached.data;

  try {
    const daysMap: Record<string, number> = { '1h': 1, '4h': 2, '1d': 7, '7d': 30 };
    const days = daysMap[timeframe] || 2;
    const chartData = await getMarketChart(coingeckoId, days);

    const prices = chartData.prices.map((p: number[]) => p[1]);
    const volumes = chartData.total_volumes.map((v: number[]) => v[1]);

    if (prices.length < 3) {
      return {
        error: true,
        error_source: 'coingecko',
        agent_guidance: 'Insufficient price data for momentum calculation. Try a longer timeframe.',
        last_known_data: null,
        data_warnings: ['Insufficient data points'],
      };
    }

    // Calculate key metrics
    const priceStart = prices[0];
    const priceCurrent = prices[prices.length - 1];
    const priceChangePercent = ((priceCurrent - priceStart) / priceStart) * 100;

    // RSI
    const rsi = calculateRSI(prices);

    // Volume trend
    const volFirst = volumes.slice(0, Math.floor(volumes.length / 2));
    const volSecond = volumes.slice(Math.floor(volumes.length / 2));
    const avgVolFirst = volFirst.reduce((a: number, b: number) => a + b, 0) / volFirst.length;
    const avgVolSecond = volSecond.reduce((a: number, b: number) => a + b, 0) / volSecond.length;
    const volChange = (avgVolSecond - avgVolFirst) / avgVolFirst;
    const volumeTrend: 'increasing' | 'stable' | 'decreasing' =
      volChange > 0.15 ? 'increasing' : volChange < -0.15 ? 'decreasing' : 'stable';

    // Consecutive direction
    const hourlyPrices = prices.filter((_: number, i: number) => i % Math.max(1, Math.floor(prices.length / 24)) === 0);
    const consecutive = getConsecutiveDirection(hourlyPrices);

    // Momentum score: -100 to +100
    let momentumScore = 0;
    momentumScore += Math.max(-40, Math.min(40, priceChangePercent * 8));
    momentumScore += rsi > 70 ? 20 : rsi > 60 ? 10 : rsi < 30 ? -20 : rsi < 40 ? -10 : 0;
    momentumScore += volumeTrend === 'increasing' ? 15 : volumeTrend === 'decreasing' ? -15 : 0;
    momentumScore += consecutive.direction === 'up' ? Math.min(25, consecutive.count * 5) : -Math.min(25, consecutive.count * 5);
    momentumScore = Math.max(-100, Math.min(100, momentumScore));

    // Direction
    const direction: MomentumOutput['direction'] =
      momentumScore > 60 ? 'strongly_bullish' :
      momentumScore > 20 ? 'bullish' :
      momentumScore > -20 ? 'neutral' :
      momentumScore > -60 ? 'bearish' :
      'strongly_bearish';

    // Strength: absolute momentum
    const strength = Math.min(100, Math.abs(momentumScore));

    // Confidence: higher when signals align
    let confidence = 50;
    const priceSignal = priceChangePercent > 0 ? 1 : -1;
    const rsiSignal = rsi > 55 ? 1 : rsi < 45 ? -1 : 0;
    const volSignal = volumeTrend === 'increasing' ? 1 : volumeTrend === 'decreasing' ? -1 : 0;
    const dirSignal = consecutive.direction === 'up' ? 1 : -1;
    const signals = [priceSignal, rsiSignal, volSignal, dirSignal];
    const aligned = signals.filter(s => s === Math.sign(momentumScore)).length;
    confidence = Math.min(95, 40 + aligned * 15);

    // Guidance
    let guidance = '';
    if (direction === 'strongly_bullish') {
      guidance = `${asset.toUpperCase()} showing strong bullish momentum on ${timeframe} timeframe. Price up ${priceChangePercent.toFixed(2)}%, RSI at ${rsi.toFixed(0)}, volume ${volumeTrend}. ${consecutive.count} consecutive bullish periods. Momentum supports long entries but watch for RSI overextension above 80.`;
    } else if (direction === 'bullish') {
      guidance = `${asset.toUpperCase()} trending bullish on ${timeframe}. Price up ${priceChangePercent.toFixed(2)}%, RSI at ${rsi.toFixed(0)}. Moderate conviction — suitable for scaling into positions. Watch for volume confirmation.`;
    } else if (direction === 'neutral') {
      guidance = `${asset.toUpperCase()} showing no clear momentum on ${timeframe}. Price change ${priceChangePercent.toFixed(2)}%, RSI at ${rsi.toFixed(0)}. Avoid directional bets until momentum clarifies. Range-bound strategy preferred.`;
    } else if (direction === 'bearish') {
      guidance = `${asset.toUpperCase()} trending bearish on ${timeframe}. Price down ${priceChangePercent.toFixed(2)}%, RSI at ${rsi.toFixed(0)}. Reduce long exposure. Consider short entries on bounces for aggressive strategies.`;
    } else {
      guidance = `${asset.toUpperCase()} showing strong bearish momentum on ${timeframe}. Price down ${priceChangePercent.toFixed(2)}%, RSI at ${rsi.toFixed(0)}, volume ${volumeTrend}. ${consecutive.count} consecutive bearish periods. High conviction short signal but watch for oversold bounce below RSI 20.`;
    }

    const result: MomentumOutput = {
      asset: asset.toLowerCase(),
      coingecko_id: coingeckoId,
      timeframe,
      direction,
      strength,
      confidence,
      price_change_percent: parseFloat(priceChangePercent.toFixed(4)),
      price_start: priceStart,
      price_current: priceCurrent,
      volume_trend: volumeTrend,
      momentum_score: parseFloat(momentumScore.toFixed(2)),
      rsi_14: parseFloat(rsi.toFixed(2)),
      consecutive_direction: consecutive.count,
      agent_guidance: guidance,
    };

    cache.set(cacheKey, result, getCacheTtl(BASE_TTL));
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return {
      error: true,
      error_source: 'coingecko',
      agent_guidance: `Momentum data unavailable for ${asset}. ${msg}. Delay momentum-based decisions until data is restored.`,
      last_known_data: null,
      data_warnings: [msg],
    };
  }
}
