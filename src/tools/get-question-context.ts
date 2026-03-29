import { CacheService } from '../cache/cache-service.js';
import { getMacroContext } from './get-macro-context.js';
import { getSentimentState } from './get-sentiment-state.js';
import { getMarketRegime } from './get-market-regime.js';
import { getAlternativeSignals } from './get-alternative-signals.js';
import { getDerivativesContext } from './get-derivatives-context.js';
import { getStablecoinFlowsTool } from './get-stablecoin-flows.js';
import { getCorrelationMatrixTool } from './get-correlation-matrix.js';
import { getEventCatalystTimeline } from './get-event-catalyst-timeline.js';
import { getDefiHealth } from './get-defi-health.js';
import { getTemporalContext } from './get-temporal-context.js';

// Keyword categories for routing questions to relevant signals
const MACRO_KEYWORDS = ['fed', 'fomc', 'rate', 'rates', 'interest', 'inflation', 'cpi', 'pce', 'gdp', 'recession', 'employment', 'jobs', 'nfp', 'unemployment', 'treasury', 'yield', 'bond', 'dollar', 'dxy', 'monetary', 'tightening', 'easing', 'dovish', 'hawkish', 'powell', 'central bank'];
const POLITICAL_KEYWORDS = ['trump', 'biden', 'president', 'election', 'executive order', 'congress', 'senate', 'house', 'legislation', 'bill', 'law', 'vote', 'impeach', 'cabinet', 'governor', 'political', 'democrat', 'republican', 'gop', 'party', 'midterm', 'campaign', 'poll', 'approval'];
const CRYPTO_KEYWORDS = ['bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'sol', 'crypto', 'defi', 'tvl', 'halving', 'etf', 'stablecoin', 'usdt', 'usdc', 'binance', 'coinbase', 'mining', 'hash', 'blockchain', 'token', 'nft', 'altcoin', 'dominance', 'market cap', 'fear', 'greed'];
const DERIVATIVES_KEYWORDS = ['options', 'futures', 'funding', 'leverage', 'liquidation', 'open interest', 'put', 'call', 'max pain', 'implied vol', 'perp', 'perpetual', 'short', 'long', 'margin'];

interface QuestionCategory {
  macro: boolean;
  political: boolean;
  crypto: boolean;
  derivatives: boolean;
}

function categorizeQuestion(question: string): QuestionCategory {
  const q = question.toLowerCase();
  return {
    macro: MACRO_KEYWORDS.some(k => q.includes(k)),
    political: POLITICAL_KEYWORDS.some(k => q.includes(k)),
    crypto: CRYPTO_KEYWORDS.some(k => q.includes(k)),
    derivatives: DERIVATIVES_KEYWORDS.some(k => q.includes(k)),
  };
}

interface RelevantSignal {
  source: string;
  field: string;
  value: string | number | boolean;
  relevance: string;
}

interface QuestionContextOutput {
  question: string;
  categories_detected: string[];
  relevant_signals: RelevantSignal[];
  historical_context: string;
  upcoming_catalysts: Array<{
    event: string;
    date: string;
    days_until: number;
    impact: string;
    relevance: string;
  }>;
  confidence_in_data: 'high' | 'medium' | 'low' | 'none';
  signals_count: number;
  data_freshness: string;
  agent_guidance: string;
}

export async function getQuestionContext(
  cache: CacheService,
  question: string,
  context?: string,
): Promise<QuestionContextOutput> {
  const categories = categorizeQuestion(question + (context ? ' ' + context : ''));
  const detectedCategories: string[] = [];
  if (categories.macro) detectedCategories.push('macro');
  if (categories.political) detectedCategories.push('political');
  if (categories.crypto) detectedCategories.push('crypto');
  if (categories.derivatives) detectedCategories.push('derivatives');

  // If we detect nothing, still try macro + sentiment as baseline
  const hasAnyCategory = detectedCategories.length > 0;
  if (!hasAnyCategory) detectedCategories.push('general');

  const signals: RelevantSignal[] = [];
  const catalysts: QuestionContextOutput['upcoming_catalysts'] = [];
  const contextParts: string[] = [];

  // Helper: safely extract data from tool results that may be errors
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function isOk(result: any): boolean {
    return !(result && typeof result === 'object' && 'error' in result && result.error === true);
  }

  // Fire relevant data fetches in parallel based on detected categories
  const fetches: Promise<void>[] = [];

  // Always fetch regime (fast, universally relevant)
  fetches.push(
    (async () => {
      try {
        const r = await getMarketRegime(cache);
        if (!isOk(r)) return;
        signals.push(
          { source: 'regime', field: 'regime', value: (r as unknown as Record<string, unknown>).regime as string, relevance: 'Current market regime sets the macro backdrop for any financial question' },
          { source: 'regime', field: 'fear_greed', value: (r as unknown as Record<string, unknown>).fear_greed_score as number, relevance: 'Market sentiment level — fear environments behave differently than greed environments' },
          { source: 'regime', field: 'confidence', value: (r as unknown as Record<string, unknown>).confidence as number, relevance: 'Confidence in regime classification' },
        );
      } catch { /* non-critical */ }
    })(),
  );

  // Macro signals
  if (categories.macro || !hasAnyCategory) {
    fetches.push(
      (async () => {
        try {
          const r = await getMacroContext(cache);
          if (!isOk(r)) return;
          const m = r as unknown as Record<string, unknown>;
          signals.push(
            { source: 'macro', field: 'fed_funds_rate', value: m.fed_funds_rate as number, relevance: 'Current Federal Funds Rate' },
            { source: 'macro', field: 'fed_funds_trend', value: m.fed_funds_trend as string, relevance: 'Fed is hiking, holding, or cutting — critical for rate decision questions' },
            { source: 'macro', field: 'dxy_value', value: m.dxy_value as number, relevance: 'Dollar strength — impacts all USD-denominated markets' },
            { source: 'macro', field: 'dxy_trend', value: m.dxy_trend as string, relevance: 'Dollar direction' },
            { source: 'macro', field: 'yield_curve', value: m.yield_curve as number, relevance: '10Y-2Y spread — recession signal' },
            { source: 'macro', field: 'yield_curve_state', value: m.yield_curve_state as string, relevance: 'Normal/flat/inverted — inverted historically precedes recessions' },
            { source: 'macro', field: 'recession_probability', value: m.recession_probability as string, relevance: 'Estimated recession probability' },
            { source: 'macro', field: 'macro_crypto_impact', value: m.macro_crypto_impact as string, relevance: 'Net macro impact on risk assets' },
          );
          contextParts.push(m.macro_summary as string);
        } catch { /* non-critical */ }
      })(),
    );
  }

  // Political signals
  if (categories.political) {
    fetches.push(
      (async () => {
        try {
          const r = await getAlternativeSignals(cache);
          if (!isOk(r)) return;
          const a = r as unknown as Record<string, unknown>;
          const pc = a.political_cycle as Record<string, unknown> | undefined;
          const ss = a.seasonality as Record<string, unknown> | undefined;
          if (pc) {
            signals.push(
              { source: 'political', field: 'presidential_term_year', value: pc.term_year as number, relevance: 'Year in presidential term — Year 3 historically strongest for markets' },
              { source: 'political', field: 'term_day', value: pc.term_day as number, relevance: 'Day in current presidential term' },
            );
          }
          if (ss) {
            signals.push(
              { source: 'seasonality', field: 'monthly_bias', value: ss.monthly_bias as string, relevance: 'Historical bias for current month' },
            );
          }
          contextParts.push(`Presidential term year ${pc?.term_year ?? 'unknown'}, day ${pc?.term_day ?? 'unknown'}. ${(pc?.term_year_label as string) ?? ''}.`);
        } catch { /* non-critical */ }
      })(),
    );
  }

  // Crypto signals
  if (categories.crypto) {
    fetches.push(
      (async () => {
        try {
          const r = await getSentimentState(cache);
          if (!isOk(r)) return;
          const s = r as unknown as Record<string, unknown>;
          signals.push(
            { source: 'sentiment', field: 'fear_greed_current', value: s.fear_greed_current as number, relevance: 'Crypto market sentiment — extreme values are contrarian indicators' },
            { source: 'sentiment', field: 'fear_greed_trend', value: s.fear_greed_trend as string, relevance: 'Sentiment direction — improving or deteriorating' },
            { source: 'sentiment', field: 'extreme_fear_opportunity', value: s.extreme_fear_opportunity as boolean, relevance: 'Whether extreme fear is signaling an accumulation opportunity' },
          );
        } catch { /* non-critical */ }
      })(),
      (async () => {
        try {
          const r = await getDefiHealth(cache);
          if (!isOk(r)) return;
          const d = r as unknown as Record<string, unknown>;
          signals.push(
            { source: 'defi', field: 'total_tvl_usd', value: d.total_tvl_usd as number, relevance: 'Total DeFi TVL — health of on-chain economy' },
            { source: 'defi', field: 'tvl_trend', value: d.tvl_trend as string, relevance: 'TVL expanding or contracting' },
            { source: 'defi', field: 'defi_health_score', value: d.defi_health_score as number, relevance: 'Overall DeFi health 0-100' },
          );
        } catch { /* non-critical */ }
      })(),
      (async () => {
        try {
          const r = await getTemporalContext(cache);
          if (!isOk(r)) return;
          const c = r as unknown as Record<string, unknown>;
          signals.push(
            { source: 'cycle', field: 'estimated_cycle_phase', value: c.estimated_cycle_phase as string, relevance: 'Bitcoin halving cycle phase — late_bull historically precedes corrections' },
            { source: 'cycle', field: 'days_since_last_halving', value: c.days_since_last_halving as number, relevance: 'Days since last halving — cycle timing' },
            { source: 'cycle', field: 'cycle_progress_percentage', value: c.cycle_progress_percentage as number, relevance: 'How far through the current halving cycle' },
          );
          contextParts.push(`Bitcoin cycle: ${c.estimated_cycle_phase} phase, ${c.days_since_last_halving} days post-halving (${c.cycle_progress_percentage}% through cycle).`);
        } catch { /* non-critical */ }
      })(),
      (async () => {
        try {
          const r = await getStablecoinFlowsTool(cache);
          if (!isOk(r)) return;
          const s = r as unknown as Record<string, unknown>;
          signals.push(
            { source: 'stablecoins', field: 'net_flow_signal', value: s.net_flow_signal as string, relevance: 'Capital entering or leaving crypto — leading indicator' },
            { source: 'stablecoins', field: 'change_7d_pct', value: s.change_7d_pct as number, relevance: '7-day stablecoin supply change' },
          );
        } catch { /* non-critical */ }
      })(),
      (async () => {
        try {
          const r = await getCorrelationMatrixTool(cache);
          if (!isOk(r)) return;
          const c = r as unknown as Record<string, unknown>;
          signals.push(
            { source: 'correlation', field: 'btc_sp500_correlation', value: c.btc_sp500_correlation as number, relevance: 'BTC/S&P correlation — when high, macro events directly impact crypto' },
            { source: 'correlation', field: 'macro_risk_appetite', value: c.macro_risk_appetite as string, relevance: 'Whether traditional markets are risk-on or risk-off' },
          );
        } catch { /* non-critical */ }
      })(),
    );
  }

  // Derivatives signals
  if (categories.derivatives || categories.crypto) {
    fetches.push(
      (async () => {
        try {
          const deriv = await getDerivativesContext(cache);
          if (!isOk(deriv)) return;
          const d = deriv as unknown as Record<string, unknown>;
          const opts = d.options as Record<string, unknown>;
          const frs = d.funding_rates as Array<Record<string, unknown>>;
          signals.push(
            { source: 'derivatives', field: 'leverage_signal', value: d.leverage_signal as string, relevance: 'Market leverage positioning — overleveraged markets are fragile' },
            { source: 'derivatives', field: 'btc_put_call_ratio', value: opts.btc_put_call_ratio as number, relevance: 'Options market sentiment — above 1 = bearish, below 1 = bullish' },
            { source: 'derivatives', field: 'btc_max_pain', value: opts.btc_max_pain as number, relevance: 'Price where most options expire worthless — gravitational pull near expiry' },
            { source: 'derivatives', field: 'btc_implied_volatility', value: opts.btc_implied_volatility as number, relevance: 'Options-implied volatility — higher = market expects bigger moves' },
          );
          for (const fr of frs) {
            signals.push(
              { source: 'derivatives', field: `${fr.asset as string}_funding_annualized`, value: fr.annualized_pct as number, relevance: `${fr.asset as string} perpetual funding rate — positive = longs pay, negative = shorts pay` },
            );
          }
          contextParts.push(d.derivatives_summary as string);
        } catch { /* non-critical */ }
      })(),
    );
  }

  // Always fetch catalysts (universally relevant)
  fetches.push(
    (async () => {
      try {
        const timeline = await getEventCatalystTimeline(cache);
        if (!isOk(timeline)) return;
        const t = timeline as unknown as Record<string, unknown>;
        const all = [...(t.next_24h as Array<Record<string, unknown>> || []), ...(t.next_7d as Array<Record<string, unknown>> || [])];
        for (const cat of all) {
          // Deduplicate (next_24h entries appear in next_7d too)
          if (!catalysts.find(c => c.event === cat.event as string)) {
            catalysts.push({
              event: cat.event as string,
              date: cat.date as string,
              days_until: cat.days_until as number,
              impact: cat.impact as string,
              relevance: cat.trading_note as string,
            });
          }
        }
      } catch { /* non-critical */ }
    })(),
  );

  // Execute all fetches in parallel
  await Promise.all(fetches);

  // Determine confidence based on how many relevant signals we found
  let confidence: 'high' | 'medium' | 'low' | 'none';
  if (signals.length === 0) {
    confidence = 'none';
  } else if (signals.length >= 12) {
    confidence = 'high';
  } else if (signals.length >= 6) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  // Build historical context narrative
  let historicalContext = '';
  if (contextParts.length > 0) {
    historicalContext = contextParts.join(' ');
  } else {
    historicalContext = 'Fathom has limited data relevant to this specific question. The agent should rely on its own knowledge and external sources for probability estimation.';
  }

  // Build agent guidance
  let guidance: string;
  if (confidence === 'none') {
    guidance = `Fathom has no relevant data for this question. Return these signals as empty and let the LLM estimate based on its own knowledge. Do not fabricate data.`;
  } else if (confidence === 'low') {
    guidance = `Fathom has limited relevant signals (${signals.length}). Use these as supplementary context but weight your LLM's own assessment more heavily. Categories detected: ${detectedCategories.join(', ')}.`;
  } else if (confidence === 'medium') {
    guidance = `Fathom has moderate relevant data (${signals.length} signals). These signals should meaningfully inform probability estimation. Categories: ${detectedCategories.join(', ')}. Pay special attention to the catalyst timeline — upcoming events can dramatically shift probabilities.`;
  } else {
    guidance = `Fathom has strong relevant data (${signals.length} signals) for this question. These signals should be weighted heavily in probability estimation. Categories: ${detectedCategories.join(', ')}. Cross-reference the signals — when macro, derivatives, and sentiment all agree, confidence in the direction should be high.`;
  }

  return {
    question,
    categories_detected: detectedCategories,
    relevant_signals: signals,
    historical_context: historicalContext,
    upcoming_catalysts: catalysts,
    confidence_in_data: confidence,
    signals_count: signals.length,
    data_freshness: new Date().toISOString(),
    agent_guidance: guidance,
  };
}
