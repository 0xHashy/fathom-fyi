import type { MarketRegimeOutput, ErrorOutput } from '../types/index.js';
import { CacheService } from '../cache/cache-service.js';
import { getCacheTtl } from '../auth/tier-check.js';
import { getGlobalData } from '../sources/coingecko.js';
import { getFearGreed, getFearGreedLabel } from '../sources/feargreed.js';
import { classifyRegime, getBtcDominanceTrend } from '../intelligence/regime-classifier.js';
import { matchHistoricalAnalog } from '../intelligence/analog-matcher.js';

const CACHE_KEY = 'market_regime';
const BASE_TTL = 300;

export async function getMarketRegime(cache: CacheService): Promise<MarketRegimeOutput | ErrorOutput> {
  const cached = cache.get<MarketRegimeOutput>(CACHE_KEY);
  if (cached) return cached.data;

  try {
    const [globalData, fgData] = await Promise.all([
      getGlobalData(),
      getFearGreed(7),
    ]);

    const fearGreed = parseInt(fgData.data[0].value, 10);
    const btcDominance = globalData.data.market_cap_percentage['btc'] ?? 0;
    const marketCapChange24h = globalData.data.market_cap_change_percentage_24h_usd;
    const totalMarketCap = globalData.data.total_market_cap['usd'] ?? 0;

    const { regime, confidence, evidence } = classifyRegime({
      fearGreed,
      btcDominance,
      marketCapChange24h,
    });

    const btcDominanceTrend = getBtcDominanceTrend(btcDominance);

    const historicalAnalog = matchHistoricalAnalog({
      regime,
      fearGreed,
      btcDominanceTrend,
    });

    const guidance = generateRegimeGuidance(regime, fearGreed, confidence, btcDominanceTrend);

    const result: MarketRegimeOutput = {
      regime,
      confidence,
      evidence,
      historical_analog: historicalAnalog,
      fear_greed_score: fearGreed,
      fear_greed_label: getFearGreedLabel(fearGreed),
      btc_dominance: Math.round(btcDominance * 100) / 100,
      btc_dominance_trend: btcDominanceTrend,
      total_market_cap_usd: totalMarketCap,
      market_cap_change_24h: Math.round(marketCapChange24h * 100) / 100,
      agent_guidance: guidance,
    };

    cache.set(CACHE_KEY, result, getCacheTtl(BASE_TTL));
    return result;
  } catch (err) {
    return {
      error: true,
      error_source: 'get_market_regime',
      agent_guidance: 'Market regime data unavailable. Fathom recommends delaying financially consequential decisions until data is restored. Treat current conditions as high-uncertainty.',
      last_known_data: cache.get<MarketRegimeOutput>(CACHE_KEY)?.data ?? null,
      data_warnings: ['Market regime data source temporarily unavailable. Retry shortly.'],
    };
  }
}

function generateRegimeGuidance(
  regime: string,
  fearGreed: number,
  confidence: number,
  domTrend: string,
): string {
  const base: Record<string, string> = {
    'euphoric': `Market is in euphoric regime (confidence: ${confidence}%). Extreme greed at ${fearGreed} — historically a distribution signal. Reduce exposure to speculative positions. Take profits on positions with 3x+ gains. Do not initiate new leveraged longs. Watch for Fear & Greed dropping below 70 as early warning of regime shift.`,
    'risk-on': `Market is in risk-on regime (confidence: ${confidence}%). Sentiment at ${fearGreed} supports continued upside. ${domTrend === 'falling' ? 'BTC dominance falling suggests altseason conditions — consider diversified exposure.' : 'Maintain core positions with trailing stops.'} Acceptable to deploy capital on pullbacks but size positions conservatively.`,
    'transitional': `Market is in transitional regime (confidence: ${confidence}%). Mixed signals at Fear & Greed ${fearGreed} — direction unclear. Reduce position sizes by 30-50% versus risk-on sizing. Wait for directional confirmation before adding exposure. Prioritize liquid positions over illiquid.`,
    'risk-off': `Market is in risk-off regime (confidence: ${confidence}%). Fear at ${fearGreed} with ${domTrend === 'rising' ? 'capital rotating to BTC safety' : 'broad weakness'}. Defensive posture recommended. Reduce altcoin exposure. Hold stablecoins and BTC only. Watch for Fear & Greed below 20 as potential contrarian accumulation signal.`,
    'capitulation': `Market is in capitulation (confidence: ${confidence}%). Extreme fear at ${fearGreed} — historically marks generational buying zones within 2-8 weeks. Do NOT panic sell. Begin dollar-cost averaging into BTC and ETH only. Avoid altcoins until Fear & Greed recovers above 30. This is when fortunes are made — by those with patience and liquidity.`,
  };

  return base[regime] ?? `Regime: ${regime}. Fear & Greed: ${fearGreed}. Proceed with caution.`;
}
