import type { ErrorOutput } from '../types/index.js';
import { CacheService } from '../cache/cache-service.js';
import { getCacheTtl } from '../auth/tier-check.js';
import { getStablecoinData, type StablecoinFlows } from '../sources/stablecoins.js';

const CACHE_KEY = 'stablecoin_flows';
const BASE_TTL = 600; // 10 min

export interface StablecoinFlowsOutput {
  total_supply_usd: number;
  change_24h_usd: number;
  change_7d_usd: number;
  change_30d_usd: number;
  change_24h_pct: number;
  change_7d_pct: number;
  change_30d_pct: number;
  net_flow_signal: string;
  top_stablecoins: Array<{
    symbol: string;
    circulating_usd: number;
    change_7d_pct: number;
    peg_price: number | null;
    depeg_risk: boolean;
  }>;
  depeg_warnings: string[];
  liquidity_summary: string;
  agent_guidance: string;
}

export async function getStablecoinFlowsTool(cache: CacheService): Promise<StablecoinFlowsOutput | ErrorOutput> {
  const cached = cache.get<StablecoinFlowsOutput>(CACHE_KEY);
  if (cached) return cached.data;

  try {
    const data = await getStablecoinData();

    const summary = generateSummary(data);
    const guidance = generateGuidance(data);

    const result: StablecoinFlowsOutput = {
      total_supply_usd: data.total_supply_usd,
      change_24h_usd: data.total_change_24h_usd,
      change_7d_usd: data.total_change_7d_usd,
      change_30d_usd: data.total_change_30d_usd,
      change_24h_pct: data.total_change_24h_pct,
      change_7d_pct: data.total_change_7d_pct,
      change_30d_pct: data.total_change_30d_pct,
      net_flow_signal: data.net_flow_signal,
      top_stablecoins: data.top_stablecoins.map(s => ({
        symbol: s.symbol,
        circulating_usd: s.circulating_usd,
        change_7d_pct: s.change_7d_pct,
        peg_price: s.peg_price,
        depeg_risk: s.depeg_risk,
      })),
      depeg_warnings: data.depeg_warnings,
      liquidity_summary: summary,
      agent_guidance: guidance,
    };

    cache.set(CACHE_KEY, result, getCacheTtl(BASE_TTL));
    return result;
  } catch (err) {
    return {
      error: true,
      error_source: 'get_stablecoin_flows',
      agent_guidance: 'Stablecoin data unavailable. Cannot assess capital inflows, minting activity, or depeg risk. This is a critical liquidity signal — proceed conservatively without it.',
      last_known_data: cache.get<StablecoinFlowsOutput>(CACHE_KEY)?.data ?? null,
      data_warnings: ['Stablecoin data source temporarily unavailable.'],
    };
  }
}

function generateSummary(data: StablecoinFlows): string {
  const totalB = (data.total_supply_usd / 1e9).toFixed(1);
  const change7dB = (Math.abs(data.total_change_7d_usd) / 1e9).toFixed(2);
  const direction = data.total_change_7d_usd >= 0 ? 'minted' : 'redeemed';
  const change30dB = (Math.abs(data.total_change_30d_usd) / 1e9).toFixed(2);
  const dir30d = data.total_change_30d_usd >= 0 ? 'minted' : 'redeemed';

  let summary = `Total stablecoin supply: $${totalB}B. $${change7dB}B ${direction} in 7 days (${data.total_change_7d_pct > 0 ? '+' : ''}${data.total_change_7d_pct.toFixed(2)}%). $${change30dB}B ${dir30d} in 30 days (${data.total_change_30d_pct > 0 ? '+' : ''}${data.total_change_30d_pct.toFixed(2)}%).`;

  if (data.depeg_warnings.length > 0) {
    summary += ` WARNING: ${data.depeg_warnings.join('. ')}.`;
  }

  return summary;
}

function generateGuidance(data: StablecoinFlows): string {
  const parts: string[] = [];

  switch (data.net_flow_signal) {
    case 'strong_inflow':
      parts.push('Strong stablecoin inflows — new capital entering crypto at an accelerated pace. Historically bullish. This is dry powder waiting to be deployed into risk assets. Constructive for prices.');
      break;
    case 'inflow':
      parts.push('Moderate stablecoin inflows — new capital entering crypto. Positive liquidity signal. The market has fuel for upside moves.');
      break;
    case 'neutral':
      parts.push('Stablecoin supply stable — no significant minting or redemptions. Liquidity is flat. Market will be driven by rotation of existing capital rather than new inflows.');
      break;
    case 'outflow':
      parts.push('Stablecoin outflows — capital leaving crypto. Net redemptions indicate reduced appetite for risk. Liquidity headwind. Favor defensive positioning.');
      break;
    case 'strong_outflow':
      parts.push('Significant stablecoin outflows — capital exiting crypto rapidly. This is a major liquidity warning. Reduce exposure. When stablecoins are being redeemed at this pace, prices often follow down.');
      break;
  }

  if (data.depeg_warnings.length > 0) {
    parts.push(`DEPEG ALERT: ${data.depeg_warnings.length} stablecoin(s) showing depeg risk. Monitor closely — stablecoin depegs can cascade into broader market contagion.`);
  }

  return parts.join(' ');
}
