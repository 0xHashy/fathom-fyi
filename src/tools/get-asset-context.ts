import type { AssetContextOutput, ErrorOutput, RiskLevel } from '../types/index.js';
import { CacheService } from '../cache/cache-service.js';
import { getCacheTtl } from '../auth/tier-check.js';
import { getCoinMarket, getMarketChart, resolveCoingeckoId } from '../sources/coingecko.js';
import {
  determineCyclePosition,
  determinePriceTrend,
  determineVolumeHealth,
  calculateSMA,
  determineVolumeTrend,
} from '../intelligence/cycle-analyzer.js';

const BASE_TTL = 120;

export async function getAssetContext(cache: CacheService, asset: string): Promise<AssetContextOutput | ErrorOutput> {
  const coingeckoId = resolveCoingeckoId(asset);
  const cacheKey = `asset_context_${coingeckoId}`;
  const cached = cache.get<AssetContextOutput>(cacheKey);
  if (cached) return cached.data;

  try {
    const [coinData, chartData] = await Promise.all([
      getCoinMarket(coingeckoId),
      getMarketChart(coingeckoId, 90),
    ]);

    const prices = chartData.prices.map(p => p[1]);
    const volumes = chartData.total_volumes.map(v => v[1]);

    const sma30 = calculateSMA(prices, 30);
    const sma90 = calculateSMA(prices, prices.length);
    const recentHigh = Math.max(...prices.slice(-30));
    const volumeTrend = determineVolumeTrend(volumes);

    const cyclePosition = determineCyclePosition({
      currentPrice: coinData.current_price,
      sma30,
      sma90,
      recentHigh,
      volumeTrend,
    });

    const priceTrend = determinePriceTrend(prices);
    const avg30dVolume = volumes.slice(-30).reduce((a, b) => a + b, 0) / Math.min(volumes.length, 30);
    const volumeHealth = determineVolumeHealth(coinData.total_volume, avg30dVolume);
    const volumeVs30d = avg30dVolume > 0 ? Math.round((coinData.total_volume / avg30dVolume) * 100) / 100 : 1;

    const riskLevel = assessRiskLevel(cyclePosition, priceTrend, volumeHealth, coinData.ath_change_percentage);
    const holderBehavior = assessHolderBehavior(cyclePosition, volumeTrend, priceTrend);
    const guidance = generateAssetGuidance(coinData.name, cyclePosition, priceTrend, riskLevel, volumeHealth, coinData.ath_change_percentage);

    const result: AssetContextOutput = {
      asset: coinData.name,
      coingecko_id: coingeckoId,
      price_usd: coinData.current_price,
      market_cap_usd: coinData.market_cap,
      volume_24h: coinData.total_volume,
      cycle_position: cyclePosition,
      vs_ath_percentage: Math.round(coinData.ath_change_percentage * 100) / 100,
      vs_atl_percentage: Math.round(coinData.atl_change_percentage * 100) / 100,
      volume_health: volumeHealth,
      volume_vs_30d_average: volumeVs30d,
      price_trend: priceTrend,
      holder_behavior: holderBehavior,
      risk_level: riskLevel,
      agent_guidance: guidance,
    };

    cache.set(cacheKey, result, getCacheTtl(BASE_TTL));
    return result;
  } catch (err) {
    return {
      error: true,
      error_source: 'get_asset_context',
      agent_guidance: `Asset data for "${asset}" unavailable. Do not make positioning decisions on this asset until data is restored. If this is a new or low-cap asset, it may not be indexed.`,
      last_known_data: cache.get<AssetContextOutput>(cacheKey)?.data ?? null,
      data_warnings: [`Failed to fetch asset data: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}

function assessRiskLevel(
  cycle: string,
  trend: string,
  volumeHealth: string,
  athChange: number,
): RiskLevel {
  let risk = 0;
  if (cycle === 'distribution' || cycle === 'markdown') risk += 2;
  if (trend === 'downtrend' || trend === 'strong_downtrend') risk += 2;
  if (volumeHealth === 'thin') risk += 1;
  if (volumeHealth === 'extreme') risk += 1;
  if (athChange < -70) risk += 1;
  if (athChange > -10) risk += 1; // near ATH = elevated risk

  if (risk >= 5) return 'extreme';
  if (risk >= 3) return 'high';
  if (risk >= 2) return 'moderate';
  return 'low';
}

function assessHolderBehavior(
  cycle: string,
  volumeTrend: string,
  priceTrend: string,
): string {
  if (cycle === 'accumulation' && volumeTrend === 'falling') {
    return 'Long-term holders accumulating. Declining volume with stable/falling price suggests weak hands have exited and strong hands are absorbing supply.';
  }
  if (cycle === 'markup' && volumeTrend === 'rising') {
    return 'Increasing participation during markup phase. Rising volume confirms buyer conviction. New money is entering the market.';
  }
  if (cycle === 'distribution') {
    return 'Distribution pattern detected. Price unable to sustain highs while volume remains elevated — suggests informed sellers are distributing to late buyers.';
  }
  if (cycle === 'markdown' && priceTrend === 'strong_downtrend') {
    return 'Active selling with conviction. Markdown phase with strong downtrend suggests holders are capitulating. Watch for volume exhaustion as a stabilization signal.';
  }
  if (cycle === 'markdown' && volumeTrend === 'falling') {
    return 'Selling pressure declining during markdown. Falling volume suggests sellers are becoming exhausted. Potential transition to accumulation if price stabilizes.';
  }
  return 'Holder behavior is neutral — no strong accumulation or distribution signals detected in the current volume/price structure.';
}

function generateAssetGuidance(
  name: string,
  cycle: string,
  trend: string,
  risk: string,
  volumeHealth: string,
  athPct: number,
): string {
  const distFromAth = Math.abs(athPct).toFixed(0);

  if (cycle === 'accumulation') {
    return `${name} is in accumulation phase — ${distFromAth}% below ATH. Risk level: ${risk}. This is historically where value investors build positions. Use dollar-cost averaging. Do not use leverage. Volume is ${volumeHealth} — wait for volume confirmation before sizing up. Price trend: ${trend}.`;
  }
  if (cycle === 'markup') {
    return `${name} is in markup phase with ${trend} trend. Risk level: ${risk}. Momentum is favorable. Hold existing positions with trailing stop at 15-20% below current price. ${volumeHealth === 'elevated' || volumeHealth === 'extreme' ? 'Elevated volume confirms conviction.' : 'Monitor volume for continuation confirmation.'} Currently ${distFromAth}% from ATH.`;
  }
  if (cycle === 'distribution') {
    return `${name} showing distribution pattern — ${distFromAth}% below ATH. Risk level: ${risk}. Price failed to sustain recent highs. Reduce position size by 25-50%. Tighten stops. Do not add new exposure. Watch for breakdown below 30-day moving average as exit signal.`;
  }
  return `${name} is in markdown phase with ${trend} trend. Risk level: ${risk}. Currently ${distFromAth}% below ATH. Avoid catching the falling knife. If already holding, set a maximum drawdown threshold and honor it. Wait for accumulation signals (declining volume, price stabilization) before re-entry.`;
}
