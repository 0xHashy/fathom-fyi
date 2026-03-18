import type { ErrorOutput } from '../types/index.js';
import { CacheService } from '../cache/cache-service.js';
import { getCacheTtl } from '../auth/tier-check.js';
import { getCorrelationData, type CorrelationMatrix } from '../sources/tradfi.js';

const CACHE_KEY = 'correlation_matrix';
const BASE_TTL = 3600; // 1 hour (daily data, doesn't change fast)

export interface CorrelationMatrixOutput {
  btc_sp500_correlation: number;
  btc_sp500_classification: string;
  btc_gold_correlation: number;
  btc_gold_classification: string;
  sp500_price: number;
  sp500_change_pct: number;
  gold_price: number;
  gold_change_pct: number;
  macro_risk_appetite: string;
  correlation_summary: string;
  agent_guidance: string;
}

export async function getCorrelationMatrixTool(cache: CacheService): Promise<CorrelationMatrixOutput | ErrorOutput> {
  const cached = cache.get<CorrelationMatrixOutput>(CACHE_KEY);
  if (cached) return cached.data;

  try {
    const data = await getCorrelationData();

    const summary = generateSummary(data);
    const guidance = generateGuidance(data);

    const result: CorrelationMatrixOutput = {
      btc_sp500_correlation: data.btc_sp500.correlation_30d,
      btc_sp500_classification: data.btc_sp500.classification,
      btc_gold_correlation: data.btc_gold.correlation_30d,
      btc_gold_classification: data.btc_gold.classification,
      sp500_price: data.sp500_price,
      sp500_change_pct: data.sp500_change_pct,
      gold_price: data.gold_price,
      gold_change_pct: data.gold_change_pct,
      macro_risk_appetite: data.macro_risk_appetite,
      correlation_summary: summary,
      agent_guidance: guidance,
    };

    cache.set(CACHE_KEY, result, getCacheTtl(BASE_TTL));
    return result;
  } catch (err) {
    return {
      error: true,
      error_source: 'get_correlation_matrix',
      agent_guidance: 'TradFi correlation data unavailable. Cannot assess BTC relationship to equities or gold. Assume moderate positive correlation with S&P 500 as a safe default. Do not use absence of this data as a reason to increase risk.',
      last_known_data: cache.get<CorrelationMatrixOutput>(CACHE_KEY)?.data ?? null,
      data_warnings: ['TradFi correlation data temporarily unavailable (Yahoo Finance).'],
    };
  }
}

function generateSummary(data: CorrelationMatrix): string {
  const sp = `S&P 500: $${data.sp500_price.toLocaleString()} (${data.sp500_change_pct > 0 ? '+' : ''}${data.sp500_change_pct}%)`;
  const gold = data.gold_price > 0
    ? `Gold: $${data.gold_price.toLocaleString()} (${data.gold_change_pct > 0 ? '+' : ''}${data.gold_change_pct}%)`
    : 'Gold: unavailable';

  const btcSp = `BTC/S&P 500 30d correlation: ${data.btc_sp500.correlation_30d.toFixed(2)} (${data.btc_sp500.classification.replace(/_/g, ' ')})`;
  const btcGold = `BTC/Gold 30d correlation: ${data.btc_gold.correlation_30d.toFixed(2)} (${data.btc_gold.classification.replace(/_/g, ' ')})`;

  return `${sp}. ${gold}. ${btcSp}. ${btcGold}. Macro risk appetite: ${data.macro_risk_appetite.replace(/_/g, ' ')}.`;
}

function generateGuidance(data: CorrelationMatrix): string {
  const parts: string[] = [];

  // BTC/S&P correlation guidance
  const spCorr = data.btc_sp500.correlation_30d;
  if (spCorr > 0.6) {
    parts.push('BTC is tightly coupled with equities right now. An S&P selloff will drag BTC. An equity rally benefits BTC. Trade BTC with awareness of equity sentiment — they are the same trade.');
  } else if (spCorr > 0.3) {
    parts.push('BTC is moderately correlated with equities. Some shared macro sensitivity. Major equity moves will likely influence BTC but the relationship is not 1:1.');
  } else if (spCorr > -0.3) {
    parts.push('BTC is decoupled from equities. Trading on crypto-native factors (cycle, sentiment, narratives). Equity market direction is less relevant to BTC positioning right now.');
  } else {
    parts.push('BTC is negatively correlated with equities — acting as a hedge or safe haven. Unusual regime. If equities sell off, BTC may benefit.');
  }

  // Gold correlation context
  const goldCorr = data.btc_gold.correlation_30d;
  if (goldCorr > 0.3) {
    parts.push('"Digital gold" narrative is active. BTC and gold moving together suggests both are benefiting from macro uncertainty or currency debasement fears.');
  }

  // Risk appetite
  if (data.macro_risk_appetite === 'risk_off') {
    parts.push('TradFi is in risk-off mode (equities down, gold up). If BTC is correlated with equities, expect downward pressure. If decoupled, BTC may hold or benefit.');
  } else if (data.macro_risk_appetite === 'risk_on') {
    parts.push('TradFi is in risk-on mode (equities up, gold flat/down). Favorable backdrop for crypto if correlation is positive.');
  }

  return parts.join(' ');
}
