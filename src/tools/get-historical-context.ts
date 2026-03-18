import type { ErrorOutput } from '../types/index.js';
import type { CacheService } from '../cache/cache-service.js';
import { getAllSignals } from '../storage/signal-store.js';
import { getFearGreed } from '../sources/feargreed.js';
import { getHistoricalTvl } from '../sources/defillama.js';
import { getMarketChart } from '../sources/coingecko.js';

export interface HistoricalContextOutput {
  requested_date: string;
  data_source: 'signal_history' | 'computed_from_historical';
  closest_signal_date: string | null;
  regime: string | null;
  fear_greed: number | null;
  fear_greed_label: string | null;
  risk_score: number | null;
  suggested_posture: string | null;
  btc_price_usd: number | null;
  total_tvl_usd: number | null;
  cycle_phase: string | null;
  agent_guidance: string;
  data_warnings: string[];
}

export async function getHistoricalContext(cache: CacheService, date: string): Promise<HistoricalContextOutput | ErrorOutput> {
  const requestedDate = new Date(date);
  if (isNaN(requestedDate.getTime())) {
    return {
      error: true, error_source: 'get_historical_context',
      agent_guidance: 'Invalid date format. Use ISO format like "2026-03-01" or "2025-12-15".',
      last_known_data: null, data_warnings: ['Invalid date format.'],
    };
  }

  const requestedTs = requestedDate.getTime();
  const warnings: string[] = [];

  // Step 1: Check signal history for closest match
  const signals = getAllSignals();
  let closestSignal = null;
  let closestDiff = Infinity;

  for (const s of signals) {
    const diff = Math.abs(new Date(s.timestamp).getTime() - requestedTs);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestSignal = s;
    }
  }

  // If we have a signal within 24 hours, use it
  if (closestSignal && closestDiff < 86400000) {
    const guidance = generateHistoricalGuidance(
      date, closestSignal.regime ?? 'unknown', closestSignal.posture ?? 'unknown',
      closestSignal.risk_score ?? 50, closestSignal.fear_greed ?? null,
    );

    return {
      requested_date: date,
      data_source: 'signal_history',
      closest_signal_date: closestSignal.timestamp,
      regime: closestSignal.regime ?? null,
      fear_greed: closestSignal.fear_greed ?? null,
      fear_greed_label: closestSignal.fear_greed !== undefined ? getFgLabel(closestSignal.fear_greed) : null,
      risk_score: closestSignal.risk_score ?? null,
      suggested_posture: closestSignal.posture ?? null,
      btc_price_usd: closestSignal.btc_price_at_signal ?? null,
      total_tvl_usd: null,
      cycle_phase: null,
      agent_guidance: guidance,
      data_warnings: warnings,
    };
  }

  // Step 2: Compute from historical data
  try {
    const now = Date.now();
    const daysAgo = Math.ceil((now - requestedTs) / 86400000);

    if (daysAgo < 1 || daysAgo > 365) {
      warnings.push('Historical data limited to the past 365 days.');
    }

    let btcPrice: number | null = null;
    let fearGreed: number | null = null;
    let tvl: number | null = null;

    // BTC price from market chart
    try {
      const chart = await getMarketChart('bitcoin', Math.min(daysAgo + 5, 365));
      const pricePoint = chart.prices.reduce((closest, p) => {
        const diff = Math.abs(p[0] - requestedTs);
        return diff < Math.abs(closest[0] - requestedTs) ? p : closest;
      });
      btcPrice = Math.round(pricePoint[1] * 100) / 100;
    } catch { warnings.push('BTC price data unavailable for this date.'); }

    // Fear & Greed (only goes back ~7 days via API)
    try {
      const fgData = await getFearGreed();
      const fgPoint = fgData.data.reduce((closest: typeof fgData.data[0] | null, entry) => {
        const entryTs = parseInt(entry.timestamp) * 1000;
        const diff = Math.abs(entryTs - requestedTs);
        if (!closest) return entry;
        const closestDiff = Math.abs(parseInt(closest.timestamp) * 1000 - requestedTs);
        return diff < closestDiff ? entry : closest;
      }, null);
      if (fgPoint) fearGreed = parseInt(fgPoint.value);
    } catch { warnings.push('Fear & Greed data unavailable for this date.'); }

    // TVL from historical
    try {
      const tvlHistory = await getHistoricalTvl();
      const tvlPoint = tvlHistory.reduce((closest, entry) => {
        const diff = Math.abs(entry.date * 1000 - requestedTs);
        return diff < Math.abs(closest.date * 1000 - requestedTs) ? entry : closest;
      });
      tvl = Math.round(tvlPoint.tvl);
    } catch { warnings.push('TVL data unavailable for this date.'); }

    const guidance = generateHistoricalGuidance(date, null, null, null, fearGreed);

    return {
      requested_date: date,
      data_source: 'computed_from_historical',
      closest_signal_date: closestSignal?.timestamp ?? null,
      regime: null,
      fear_greed: fearGreed,
      fear_greed_label: fearGreed !== null ? getFgLabel(fearGreed) : null,
      risk_score: null,
      suggested_posture: null,
      btc_price_usd: btcPrice,
      total_tvl_usd: tvl,
      cycle_phase: null,
      agent_guidance: guidance,
      data_warnings: warnings,
    };
  } catch {
    return {
      error: true, error_source: 'get_historical_context',
      agent_guidance: 'Historical context temporarily unavailable. Retry shortly.',
      last_known_data: null, data_warnings: ['Historical data sources temporarily unavailable.'],
    };
  }
}

function getFgLabel(score: number): string {
  if (score < 25) return 'Extreme Fear';
  if (score < 50) return 'Fear';
  if (score < 75) return 'Greed';
  return 'Extreme Greed';
}

function generateHistoricalGuidance(
  date: string, regime: string | null, posture: string | null,
  riskScore: number | null, fearGreed: number | null,
): string {
  let g = `Historical context for ${date}: `;

  if (regime) g += `Regime was ${regime}. `;
  if (posture) g += `Suggested posture was ${posture}. `;
  if (riskScore !== null) g += `Risk score was ${riskScore}/100. `;
  if (fearGreed !== null) g += `Fear & Greed was ${fearGreed} (${getFgLabel(fearGreed)}). `;

  if (!regime && !posture && !riskScore) {
    g += 'Limited Fathom signal data for this date. Showing available market data. ';
  }

  g += 'Use this to compare past conditions to current conditions for decision context.';
  return g;
}
