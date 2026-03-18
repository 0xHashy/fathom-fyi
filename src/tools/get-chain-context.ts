import type { ErrorOutput } from '../types/index.js';
import { CacheService } from '../cache/cache-service.js';
import { getCacheTtl } from '../auth/tier-check.js';
import { getChains, getProtocols, getChainHistoricalTvl } from '../sources/defillama.js';

const BASE_TTL = 600;

const CHAIN_ALIASES: Record<string, string> = {
  eth: 'Ethereum', ethereum: 'Ethereum',
  sol: 'Solana', solana: 'Solana',
  bsc: 'BSC', bnb: 'BSC', binance: 'BSC',
  arb: 'Arbitrum', arbitrum: 'Arbitrum',
  op: 'Optimism', optimism: 'Optimism',
  base: 'Base',
  avax: 'Avalanche', avalanche: 'Avalanche',
  matic: 'Polygon', polygon: 'Polygon',
  tron: 'Tron',
  btc: 'Bitcoin', bitcoin: 'Bitcoin',
};

function resolveChainName(input: string): string {
  const normalized = input.toLowerCase().trim();
  return CHAIN_ALIASES[normalized] ?? input;
}

export interface ChainContextOutput {
  chain: string;
  chain_tvl_usd: number;
  chain_dominance_pct: number;
  tvl_change_7d: number;
  tvl_change_30d: number;
  tvl_trend: 'expanding' | 'stable' | 'contracting' | 'collapsing';
  top_protocols: Array<{ name: string; tvl_usd: number; category: string; dominance_on_chain: number }>;
  protocol_count: number;
  chain_dominance_shift: 'gaining' | 'stable' | 'losing';
  agent_guidance: string;
}

export async function getChainContext(cache: CacheService, chain: string): Promise<ChainContextOutput | ErrorOutput> {
  const chainName = resolveChainName(chain);
  const cacheKey = `chain_context_${chainName.toLowerCase()}`;
  const cached = cache.get<ChainContextOutput>(cacheKey);
  if (cached) return cached.data;

  try {
    const [chains, protocols, history] = await Promise.all([
      getChains(),
      getProtocols(),
      getChainHistoricalTvl(chainName).catch(() => []),
    ]);

    const chainData = chains.find(c => c.name.toLowerCase() === chainName.toLowerCase());
    if (!chainData) {
      return {
        error: true, error_source: 'get_chain_context',
        agent_guidance: 'Chain not found. Verify the chain name and retry.',
        last_known_data: null, data_warnings: ['Chain not found in DeFiLlama data.'],
      };
    }

    const totalTvl = chains.reduce((sum, c) => sum + c.tvl, 0);
    const dominancePct = totalTvl > 0 ? Math.round((chainData.tvl / totalTvl) * 10000) / 100 : 0;

    // TVL changes from history
    let tvlChange7d = 0;
    let tvlChange30d = 0;
    if (history.length > 7) {
      const current = history[history.length - 1]?.tvl ?? chainData.tvl;
      const weekAgo = history[history.length - 8]?.tvl ?? current;
      tvlChange7d = weekAgo > 0 ? Math.round(((current - weekAgo) / weekAgo) * 10000) / 100 : 0;
      if (history.length > 30) {
        const monthAgo = history[history.length - 31]?.tvl ?? current;
        tvlChange30d = monthAgo > 0 ? Math.round(((current - monthAgo) / monthAgo) * 10000) / 100 : 0;
      }
    }

    let tvlTrend: ChainContextOutput['tvl_trend'] = 'stable';
    if (tvlChange7d > 10) tvlTrend = 'expanding';
    else if (tvlChange7d > 3) tvlTrend = 'expanding';
    else if (tvlChange7d < -10) tvlTrend = 'collapsing';
    else if (tvlChange7d < -3) tvlTrend = 'contracting';

    // Top protocols on this chain
    const chainProtocols = protocols
      .filter(p => p.chain.toLowerCase() === chainName.toLowerCase() || p.chain === '-')
      .sort((a, b) => b.tvl - a.tvl)
      .slice(0, 10);

    const topProtocols = chainProtocols.map(p => ({
      name: p.name,
      tvl_usd: p.tvl,
      category: p.category,
      dominance_on_chain: chainData.tvl > 0 ? Math.round((p.tvl / chainData.tvl) * 10000) / 100 : 0,
    }));

    // Dominance shift
    let dominanceShift: ChainContextOutput['chain_dominance_shift'] = 'stable';
    if (tvlChange7d > 5 && tvlChange7d > tvlChange30d / 4) dominanceShift = 'gaining';
    else if (tvlChange7d < -5) dominanceShift = 'losing';

    const guidance = generateChainGuidance(chainName, chainData.tvl, dominancePct, tvlTrend, dominanceShift, tvlChange7d);

    const result: ChainContextOutput = {
      chain: chainName,
      chain_tvl_usd: chainData.tvl,
      chain_dominance_pct: dominancePct,
      tvl_change_7d: tvlChange7d,
      tvl_change_30d: tvlChange30d,
      tvl_trend: tvlTrend,
      top_protocols: topProtocols,
      protocol_count: chainProtocols.length,
      chain_dominance_shift: dominanceShift,
      agent_guidance: guidance,
    };

    cache.set(cacheKey, result, getCacheTtl(BASE_TTL));
    return result;
  } catch {
    return {
      error: true, error_source: 'get_chain_context',
      agent_guidance: 'Chain context temporarily unavailable. Retry shortly.',
      last_known_data: null, data_warnings: ['Chain data source temporarily unavailable.'],
    };
  }
}

function generateChainGuidance(chain: string, tvl: number, dominance: number, trend: string, shift: string, change7d: number): string {
  const tvlStr = tvl >= 1e9 ? `$${(tvl / 1e9).toFixed(1)}B` : `$${(tvl / 1e6).toFixed(0)}M`;
  let g = `${chain} TVL: ${tvlStr} (${dominance}% of total DeFi). `;

  if (trend === 'expanding') g += `TVL expanding ${change7d > 0 ? '+' : ''}${change7d}% over 7d — capital is flowing in. Favorable for ${chain}-native protocol positions. `;
  else if (trend === 'contracting') g += `TVL contracting ${change7d}% over 7d — capital outflow detected. Reduce ${chain}-specific exposure. `;
  else if (trend === 'collapsing') g += `TVL collapsing ${change7d}% over 7d — significant capital flight. Avoid new ${chain} positions. Exit yield strategies. `;
  else g += `TVL stable. No strong directional signal from chain-level flows. `;

  if (shift === 'gaining') g += `${chain} is gaining market share vs other chains.`;
  else if (shift === 'losing') g += `${chain} is losing market share to competing chains.`;

  return g;
}
