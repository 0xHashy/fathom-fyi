import type { PortfolioHolding } from './portfolio-store.js';
import { resolveCoingeckoId, getCoinMarket } from '../sources/coingecko.js';

export interface PortfolioPosition {
  asset: string;
  coingecko_id: string;
  amount: number;
  price_usd: number;
  value_usd: number;
  allocation_pct: number;
  entry_price_usd: number | null;
  pnl_pct: number | null;
  pnl_usd: number | null;
}

export interface PortfolioAnalysis {
  total_value_usd: number;
  positions: PortfolioPosition[];
  concentration_risk: 'low' | 'moderate' | 'high' | 'extreme';
  largest_position_pct: number;
  stablecoin_allocation_pct: number;
  regime_alignment: 'aligned' | 'misaligned' | 'neutral';
  regime_alignment_detail: string;
  rebalancing_suggestions: string[];
  agent_guidance: string;
}

const STABLECOINS = new Set(['tether', 'usd-coin', 'dai', 'frax', 'true-usd', 'usdd', 'usdc', 'usdt']);

export async function analyzePortfolio(
  holdings: PortfolioHolding[],
  suggestedPosture: string,
  regime: string,
  riskScore: number,
): Promise<PortfolioAnalysis> {
  // Fetch current prices for all holdings
  const positions: PortfolioPosition[] = [];
  let totalValue = 0;

  for (const h of holdings) {
    const coingeckoId = resolveCoingeckoId(h.asset);
    let price = 0;

    if (STABLECOINS.has(coingeckoId)) {
      price = 1; // Stablecoins assumed at $1
    } else {
      try {
        const market = await getCoinMarket(coingeckoId);
        price = market.current_price;
      } catch {
        continue; // Skip assets we can't price
      }
    }

    const value = h.amount * price;
    totalValue += value;

    const pnlPct = h.entry_price_usd
      ? ((price - h.entry_price_usd) / h.entry_price_usd) * 100
      : null;
    const pnlUsd = h.entry_price_usd
      ? (price - h.entry_price_usd) * h.amount
      : null;

    positions.push({
      asset: h.asset,
      coingecko_id: coingeckoId,
      amount: h.amount,
      price_usd: price,
      value_usd: Math.round(value * 100) / 100,
      allocation_pct: 0, // computed below
      entry_price_usd: h.entry_price_usd ?? null,
      pnl_pct: pnlPct !== null ? Math.round(pnlPct * 100) / 100 : null,
      pnl_usd: pnlUsd !== null ? Math.round(pnlUsd * 100) / 100 : null,
    });
  }

  // Compute allocations
  for (const p of positions) {
    p.allocation_pct = totalValue > 0 ? Math.round((p.value_usd / totalValue) * 10000) / 100 : 0;
  }

  positions.sort((a, b) => b.value_usd - a.value_usd);

  const largestPct = positions.length > 0 ? positions[0].allocation_pct : 0;
  const stablePct = positions
    .filter(p => STABLECOINS.has(p.coingecko_id))
    .reduce((sum, p) => sum + p.allocation_pct, 0);

  // Concentration risk
  let concentrationRisk: 'low' | 'moderate' | 'high' | 'extreme' = 'low';
  if (largestPct > 80) concentrationRisk = 'extreme';
  else if (largestPct > 60) concentrationRisk = 'high';
  else if (largestPct > 40) concentrationRisk = 'moderate';

  // Regime alignment
  const { alignment, detail } = assessRegimeAlignment(
    suggestedPosture, regime, stablePct, concentrationRisk, positions,
  );

  // Rebalancing suggestions
  const suggestions = generateRebalancingSuggestions(
    suggestedPosture, stablePct, largestPct, concentrationRisk, positions, riskScore,
  );

  const guidance = generatePortfolioGuidance(
    totalValue, suggestedPosture, alignment, stablePct, concentrationRisk, riskScore,
  );

  return {
    total_value_usd: Math.round(totalValue * 100) / 100,
    positions,
    concentration_risk: concentrationRisk,
    largest_position_pct: largestPct,
    stablecoin_allocation_pct: Math.round(stablePct * 100) / 100,
    regime_alignment: alignment,
    regime_alignment_detail: detail,
    rebalancing_suggestions: suggestions,
    agent_guidance: guidance,
  };
}

function assessRegimeAlignment(
  posture: string,
  regime: string,
  stablePct: number,
  concentration: string,
  positions: PortfolioPosition[],
): { alignment: 'aligned' | 'misaligned' | 'neutral'; detail: string } {
  if (posture === 'defensive' || posture === 'sideline') {
    if (stablePct >= 40) {
      return { alignment: 'aligned', detail: `Portfolio has ${stablePct.toFixed(0)}% in stablecoins — appropriate for ${posture} posture during ${regime} regime.` };
    }
    if (stablePct < 15) {
      return { alignment: 'misaligned', detail: `Portfolio has only ${stablePct.toFixed(0)}% in stablecoins — dangerously underweight for ${posture} posture. Fathom recommends 40%+ stable allocation in ${regime} regime.` };
    }
    return { alignment: 'neutral', detail: `Portfolio has ${stablePct.toFixed(0)}% in stablecoins — below recommended 40% for ${posture} posture but not critically exposed.` };
  }

  if (posture === 'aggressive') {
    if (stablePct > 60) {
      return { alignment: 'misaligned', detail: `Portfolio has ${stablePct.toFixed(0)}% in stablecoins — too conservative for ${posture} posture. Consider deploying capital into risk assets.` };
    }
    return { alignment: 'aligned', detail: `Portfolio is positioned for ${posture} posture with ${stablePct.toFixed(0)}% stablecoins and active risk exposure.` };
  }

  return { alignment: 'neutral', detail: `Portfolio is moderately positioned. ${posture} posture suggests balanced allocation.` };
}

function generateRebalancingSuggestions(
  posture: string,
  stablePct: number,
  largestPct: number,
  concentration: string,
  positions: PortfolioPosition[],
  riskScore: number,
): string[] {
  const suggestions: string[] = [];

  if ((posture === 'defensive' || posture === 'sideline') && stablePct < 30) {
    const target = posture === 'sideline' ? 60 : 40;
    suggestions.push(`Increase stablecoin allocation from ${stablePct.toFixed(0)}% to ${target}%+. Current posture is ${posture}.`);
  }

  if (concentration === 'extreme' || concentration === 'high') {
    suggestions.push(`Reduce concentration risk. Largest position is ${largestPct.toFixed(0)}% of portfolio — consider trimming to below 40%.`);
  }

  // Flag overweight altcoin positions in risk-off
  if (posture === 'defensive' || posture === 'sideline') {
    const altcoins = positions.filter(p =>
      !STABLECOINS.has(p.coingecko_id) && p.coingecko_id !== 'bitcoin' && p.allocation_pct > 15
    );
    for (const alt of altcoins) {
      suggestions.push(`${alt.asset} is ${alt.allocation_pct.toFixed(0)}% of portfolio — overweight for ${posture} posture. Consider reducing by 50%.`);
    }
  }

  // Flag profitable positions that should be trimmed
  if (riskScore > 60) {
    const profitable = positions.filter(p => p.pnl_pct !== null && p.pnl_pct > 50);
    for (const p of profitable) {
      suggestions.push(`${p.asset} is up ${p.pnl_pct?.toFixed(0)}% — with risk score at ${riskScore}, consider taking partial profits.`);
    }
  }

  if (suggestions.length === 0) {
    suggestions.push('No immediate rebalancing needed. Portfolio is reasonably positioned for current conditions.');
  }

  return suggestions;
}

function generatePortfolioGuidance(
  totalValue: number,
  posture: string,
  alignment: string,
  stablePct: number,
  concentration: string,
  riskScore: number,
): string {
  const valueStr = totalValue >= 1000000
    ? `$${(totalValue / 1000000).toFixed(2)}M`
    : totalValue >= 1000
      ? `$${(totalValue / 1000).toFixed(1)}K`
      : `$${totalValue.toFixed(2)}`;

  let guidance = `Portfolio value: ${valueStr}. `;

  if (alignment === 'misaligned') {
    guidance += `WARNING: Portfolio is misaligned with Fathom's ${posture} posture recommendation. `;
    if (posture === 'defensive' || posture === 'sideline') {
      guidance += `Stablecoin allocation at ${stablePct.toFixed(0)}% is too low for current risk environment (risk score: ${riskScore}). Prioritize rebalancing before market conditions deteriorate further.`;
    } else {
      guidance += `Portfolio is too conservative for current opportunities. Consider deploying idle capital.`;
    }
  } else if (alignment === 'aligned') {
    guidance += `Portfolio is aligned with ${posture} posture. `;
    if (concentration === 'high' || concentration === 'extreme') {
      guidance += `However, concentration risk is ${concentration}. Diversification recommended even when directionally correct.`;
    } else {
      guidance += `Maintain current allocation. Monitor for regime changes that would require rebalancing.`;
    }
  } else {
    guidance += `Portfolio is neutral relative to ${posture} posture. Risk score: ${riskScore}. `;
    guidance += `Consider gradual rebalancing toward the recommended posture rather than aggressive repositioning.`;
  }

  return guidance;
}
