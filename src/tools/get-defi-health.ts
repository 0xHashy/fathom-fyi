import type { DefiHealthOutput, ChainTvl, ProtocolTvl, TvlTrend, RevenueTrend, EcosystemConcentration, ErrorOutput } from '../types/index.js';
import { CacheService } from '../cache/cache-service.js';
import { getCacheTtl } from '../auth/tier-check.js';
import { getHistoricalTvl, getChains, getProtocols, getFees } from '../sources/defillama.js';

const CACHE_KEY = 'defi_health';
const BASE_TTL = 600;

export async function getDefiHealth(cache: CacheService): Promise<DefiHealthOutput | ErrorOutput> {
  const cached = cache.get<DefiHealthOutput>(CACHE_KEY);
  if (cached) return cached.data;

  try {
    const [historicalTvl, chains, protocols, feesResult] = await Promise.allSettled([
      getHistoricalTvl(),
      getChains(),
      getProtocols(),
      getFees(),
    ]);

    // Total TVL and changes
    let totalTvl = 0;
    let tvlChange24h = 0;
    let tvlChange7d = 0;

    if (historicalTvl.status === 'fulfilled') {
      const data = historicalTvl.value;
      if (data.length > 0) {
        totalTvl = data[data.length - 1].tvl;
        if (data.length > 1) {
          const yesterday = data[data.length - 2].tvl;
          tvlChange24h = yesterday > 0 ? ((totalTvl - yesterday) / yesterday) * 100 : 0;
        }
        if (data.length > 7) {
          const weekAgo = data[data.length - 8].tvl;
          tvlChange7d = weekAgo > 0 ? ((totalTvl - weekAgo) / weekAgo) * 100 : 0;
        }
      }
    }

    // TVL trend
    const tvlTrend = classifyTvlTrend(tvlChange7d);

    // Top chains
    let topChains: ChainTvl[] = [];
    if (chains.status === 'fulfilled') {
      const sorted = chains.value.sort((a, b) => b.tvl - a.tvl).slice(0, 10);
      const totalChainTvl = sorted.reduce((s, c) => s + c.tvl, 0);
      topChains = sorted.map(c => ({
        name: c.name,
        tvl_usd: c.tvl,
        tvl_change_7d: 0, // Not directly available from chains endpoint
        dominance_percentage: totalChainTvl > 0 ? Math.round((c.tvl / totalChainTvl) * 10000) / 100 : 0,
      }));
    }

    // Top protocols
    let topProtocols: ProtocolTvl[] = [];
    if (protocols.status === 'fulfilled') {
      topProtocols = protocols.value
        .sort((a, b) => b.tvl - a.tvl)
        .slice(0, 10)
        .map(p => ({
          name: p.name,
          tvl_usd: p.tvl,
          category: p.category ?? 'Unknown',
          change_7d: p.change_7d ?? 0,
        }));
    }

    // Protocol revenue trend
    let revenueTrend: RevenueTrend = 'stable';
    if (feesResult.status === 'fulfilled' && feesResult.value.protocols) {
      const topFeeProtocols = feesResult.value.protocols
        .filter(p => p.total24h !== null && p.total7d !== null)
        .slice(0, 10);

      if (topFeeProtocols.length > 0) {
        const avgDaily = topFeeProtocols.reduce((s, p) => s + (p.total24h ?? 0), 0) / topFeeProtocols.length;
        const avgWeeklyDaily = topFeeProtocols.reduce((s, p) => s + ((p.total7d ?? 0) / 7), 0) / topFeeProtocols.length;
        if (avgWeeklyDaily > 0) {
          const ratio = avgDaily / avgWeeklyDaily;
          if (ratio > 1.2) revenueTrend = 'growing';
          else if (ratio < 0.8) revenueTrend = 'declining';
        }
      }
    }

    // Ecosystem concentration
    const topChainDominance = topChains.length > 0 ? topChains[0].dominance_percentage : 0;
    const concentration: EcosystemConcentration =
      topChainDominance > 70 ? 'dangerous' :
      topChainDominance > 40 ? 'concentrated' :
      'healthy';

    // Health score
    const healthScore = calculateHealthScore(tvlChange7d, topChainDominance, revenueTrend);

    const guidance = generateDefiGuidance(tvlTrend, healthScore, concentration, revenueTrend, totalTvl);

    const result: DefiHealthOutput = {
      total_tvl_usd: totalTvl,
      tvl_change_24h: Math.round(tvlChange24h * 100) / 100,
      tvl_change_7d: Math.round(tvlChange7d * 100) / 100,
      tvl_trend: tvlTrend,
      top_chains: topChains,
      top_protocols: topProtocols,
      defi_health_score: healthScore,
      protocol_revenue_trend: revenueTrend,
      ecosystem_concentration: concentration,
      agent_guidance: guidance,
    };

    cache.set(CACHE_KEY, result, getCacheTtl(BASE_TTL));
    return result;

  } catch (err) {
    return {
      error: true,
      error_source: 'get_defi_health',
      agent_guidance: 'DeFi health data unavailable. Without DeFi context, avoid yield farming or protocol-specific positions. Stick to spot holdings until DeFi data is restored.',
      last_known_data: cache.get<DefiHealthOutput>(CACHE_KEY)?.data ?? null,
      data_warnings: [`Failed to fetch DeFi data: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}

function classifyTvlTrend(change7d: number): TvlTrend {
  if (change7d > 5) return 'expanding';
  if (change7d > -2) return 'stable';
  if (change7d > -10) return 'contracting';
  return 'collapsing';
}

function calculateHealthScore(tvlChange7d: number, topChainDominance: number, revenueTrend: RevenueTrend): number {
  let score = 50;

  if (tvlChange7d > 10) score += 20;
  else if (tvlChange7d > 5) score += 10;
  else if (tvlChange7d < -10) score -= 20;
  else if (tvlChange7d < -5) score -= 10;

  if (topChainDominance < 40) score += 10;
  else if (topChainDominance > 70) score -= 10;

  if (revenueTrend === 'growing') score += 10;
  else if (revenueTrend === 'declining') score -= 10;

  return Math.max(0, Math.min(100, score));
}

function generateDefiGuidance(
  trend: TvlTrend,
  healthScore: number,
  concentration: EcosystemConcentration,
  revenueTrend: RevenueTrend,
  totalTvl: number,
): string {
  const tvlFormatted = totalTvl > 1e12
    ? `$${(totalTvl / 1e12).toFixed(2)}T`
    : `$${(totalTvl / 1e9).toFixed(2)}B`;

  const trendGuidance: Record<TvlTrend, string> = {
    'expanding': `DeFi TVL is expanding at ${tvlFormatted} — on-chain economic activity is growing. This supports risk-on positioning in DeFi tokens and yield strategies. Protocol revenue is ${revenueTrend} — ${revenueTrend === 'growing' ? 'real usage is driving growth, not just incentives' : 'monitor for sustainability'}.`,
    'stable': `DeFi TVL is stable at ${tvlFormatted} — on-chain activity is neither growing nor shrinking. No strong signal for DeFi-specific positioning. Stick with established protocols with proven revenue. Ecosystem concentration: ${concentration}.`,
    'contracting': `DeFi TVL is contracting at ${tvlFormatted} — capital is leaving on-chain protocols. Reduce DeFi exposure. Avoid yield farming in smaller protocols — smart contract risk increases as TVL declines. Protocol revenue is ${revenueTrend}. Prioritize established platforms only.`,
    'collapsing': `DeFi TVL is collapsing at ${tvlFormatted} — severe stress across the ecosystem. EXIT all DeFi positions except stablecoins on top-tier platforms. This level of TVL decline historically correlates with protocol failures and contagion events. Health score: ${healthScore}/100.`,
  };

  return `DeFi health score: ${healthScore}/100. ${trendGuidance[trend]}`;
}
