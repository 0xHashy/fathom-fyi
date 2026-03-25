import type { ErrorOutput } from '../types/index.js';
import { CacheService } from '../cache/cache-service.js';
import { getCacheTtl } from '../auth/tier-check.js';
import { getDerivativesData, type DerivativesData } from '../sources/deribit.js';

const CACHE_KEY = 'derivatives_context';
const BASE_TTL = 300; // 5 min

export interface DerivativesContextOutput {
  funding_rates: Array<{
    asset: string;
    rate_8h: number;
    annualized_pct: number;
    annualized_rate: number;
    sentiment: string;
    trajectory: 'rising' | 'stable' | 'falling';
    projected_next: string;
  }>;
  options: {
    btc_put_call_ratio: number;
    btc_open_interest_usd: number;
    btc_volume_24h_usd: number;
    btc_implied_volatility: number;
    btc_max_pain: number;
    btc_options_sentiment: string;
    eth_put_call_ratio: number | null;
    eth_open_interest_usd: number | null;
    eth_options_sentiment: string | null;
    nearest_expiry: string;
  };
  leverage_signal: 'overleveraged_long' | 'leveraged_long' | 'neutral' | 'leveraged_short' | 'overleveraged_short';
  derivatives_summary: string;
  agent_guidance: string;
}

export async function getDerivativesContext(cache: CacheService): Promise<DerivativesContextOutput | ErrorOutput> {
  const cached = cache.get<DerivativesContextOutput>(CACHE_KEY);
  if (cached) return cached.data;

  try {
    const data = await getDerivativesData();

    const fundingRates = data.funding_rates.map(f => {
      // Determine trajectory from annualized rate magnitude
      const rate = f.annualized_rate;
      const trajectory: 'rising' | 'stable' | 'falling' =
        rate > 30 ? 'rising' : rate < -10 ? 'falling' : 'stable';
      // Project next funding direction
      const projected = rate > 20 ? 'Likely to remain elevated or increase — longs paying heavy premium'
        : rate < -10 ? 'Likely to go more negative — shorts paying premium, potential short squeeze setup'
        : 'Likely stable — no strong directional pressure from funding';
      return {
        asset: f.asset,
        rate_8h: f.current_rate_8h,
        annualized_pct: f.annualized_rate,
        annualized_rate: f.annualized_rate,
        sentiment: f.sentiment,
        trajectory,
        projected_next: projected,
      };
    });

    const btcOpts = data.options_btc;
    const ethOpts = data.options_eth;

    // Determine leverage signal from funding + put/call
    const leverageSignal = determineLeverageSignal(data);
    const summary = generateSummary(data);
    const guidance = generateGuidance(data, leverageSignal);

    const result: DerivativesContextOutput = {
      funding_rates: fundingRates,
      options: {
        btc_put_call_ratio: btcOpts.put_call_ratio,
        btc_open_interest_usd: btcOpts.total_open_interest_usd,
        btc_volume_24h_usd: btcOpts.total_volume_24h_usd,
        btc_implied_volatility: btcOpts.avg_implied_volatility,
        btc_max_pain: btcOpts.max_pain_price,
        btc_options_sentiment: btcOpts.sentiment,
        eth_put_call_ratio: ethOpts?.put_call_ratio ?? null,
        eth_open_interest_usd: ethOpts?.total_open_interest_usd ?? null,
        eth_options_sentiment: ethOpts?.sentiment ?? null,
        nearest_expiry: btcOpts.nearest_expiry,
      },
      leverage_signal: leverageSignal,
      derivatives_summary: summary,
      agent_guidance: guidance,
    };

    cache.set(CACHE_KEY, result, getCacheTtl(BASE_TTL));
    return result;
  } catch (err) {
    return {
      error: true,
      error_source: 'get_derivatives_context',
      agent_guidance: 'Derivatives data unavailable (Deribit API). Cannot assess funding rates, options flow, or leverage positioning. Proceed with caution — you are missing leverage and positioning signals.',
      last_known_data: cache.get<DerivativesContextOutput>(CACHE_KEY)?.data ?? null,
      data_warnings: ['Derivatives data source temporarily unavailable.'],
    };
  }
}

function determineLeverageSignal(data: DerivativesData): DerivativesContextOutput['leverage_signal'] {
  const btcFunding = data.funding_rates.find(f => f.asset === 'BTC');
  const pcr = data.options_btc.put_call_ratio;

  let score = 0; // positive = overleveraged long, negative = overleveraged short

  if (btcFunding) {
    if (btcFunding.annualized_rate > 50) score += 3;
    else if (btcFunding.annualized_rate > 15) score += 1;
    else if (btcFunding.annualized_rate < -50) score -= 3;
    else if (btcFunding.annualized_rate < -15) score -= 1;
  }

  // Low put/call = bullish positioning (potential overleveraged long)
  if (pcr < 0.5) score += 1;
  else if (pcr > 1.2) score -= 1;

  if (score >= 3) return 'overleveraged_long';
  if (score >= 1) return 'leveraged_long';
  if (score <= -3) return 'overleveraged_short';
  if (score <= -1) return 'leveraged_short';
  return 'neutral';
}

function generateSummary(data: DerivativesData): string {
  const btcFunding = data.funding_rates.find(f => f.asset === 'BTC');
  const pcr = data.options_btc.put_call_ratio;
  const oi = data.options_btc.total_open_interest_usd;
  const iv = data.options_btc.avg_implied_volatility;
  const maxPain = data.options_btc.max_pain_price;

  const parts: string[] = [];

  if (btcFunding) {
    parts.push(`BTC perpetual funding: ${btcFunding.annualized_rate > 0 ? '+' : ''}${btcFunding.annualized_rate.toFixed(1)}% annualized (${btcFunding.sentiment.replace(/_/g, ' ')})`);
  }

  parts.push(`Options: P/C ratio ${pcr.toFixed(2)}, OI $${(oi / 1e9).toFixed(1)}B, IV ${iv.toFixed(0)}%, max pain $${maxPain.toLocaleString()}`);

  if (data.options_btc.nearest_expiry) {
    parts.push(`Nearest expiry: ${data.options_btc.nearest_expiry}`);
  }

  return parts.join('. ') + '.';
}

function generateGuidance(data: DerivativesData, leverage: string): string {
  const pcr = data.options_btc.put_call_ratio;
  const btcFunding = data.funding_rates.find(f => f.asset === 'BTC');
  const maxPain = data.options_btc.max_pain_price;

  const parts: string[] = [];

  if (leverage === 'overleveraged_long') {
    parts.push('Market is overleveraged long. High funding rates and low put/call ratio suggest a crowded long trade. Elevated risk of a long squeeze. Reduce long exposure or tighten stops.');
  } else if (leverage === 'overleveraged_short') {
    parts.push('Market is overleveraged short. Negative funding and high put/call ratio suggest excessive bearishness. Short squeeze potential. Contrarian long setups may offer favorable risk/reward.');
  } else if (leverage === 'leveraged_long') {
    parts.push('Moderate long bias in derivatives. Funding positive but not extreme. Monitor for acceleration.');
  } else if (leverage === 'leveraged_short') {
    parts.push('Moderate short bias in derivatives. Market hedging downside. Watch for capitulation or reversal signals.');
  } else {
    parts.push('Derivatives positioning is neutral. No clear leverage imbalance. Trade based on other signals.');
  }

  if (maxPain > 0) {
    parts.push(`Max pain at $${maxPain.toLocaleString()} — price tends to gravitate toward max pain near options expiry.`);
  }

  if (pcr > 1.0) {
    parts.push('Elevated put/call ratio indicates hedging or bearish positioning. Historically this can be a contrarian bullish signal when extreme.');
  }

  return parts.join(' ');
}
