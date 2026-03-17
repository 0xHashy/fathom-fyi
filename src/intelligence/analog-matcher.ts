import type { Regime, TemporalCyclePhase } from '../types/index.js';

interface AnalogContext {
  regime?: Regime;
  fearGreed?: number;
  cyclePhase?: TemporalCyclePhase;
  btcDominanceTrend?: 'rising' | 'falling' | 'neutral';
  defiTvlTrend?: 'expanding' | 'stable' | 'contracting' | 'collapsing';
  macroImpact?: 'tailwind' | 'neutral' | 'headwind' | 'strong_headwind';
}

interface HistoricalAnalog {
  period: string;
  description: string;
  tags: string[];
  fearGreedRange: [number, number];
}

const HISTORICAL_ANALOGS: HistoricalAnalog[] = [
  {
    period: 'March 2020',
    description: 'COVID black swan capitulation — BTC crashed 50% in 48 hours to $3,800. Extreme fear hit single digits. DeFi TVL collapsed. Yet it marked the fastest recovery in crypto history, with BTC reclaiming $10K within 2 months and beginning the run to $69K.',
    tags: ['capitulation', 'black_swan', 'extreme_fear', 'rapid_recovery'],
    fearGreedRange: [0, 15],
  },
  {
    period: 'October 2020',
    description: 'Pre-bull-run accumulation phase — BTC was range-bound around $10K-$12K. Fear & Greed was neutral, BTC dominance was peaking before the coming altseason rotation. Smart money was accumulating. DeFi Summer had ended but TVL was stabilizing. This preceded the move from $12K to $64K.',
    tags: ['accumulation', 'early_bull', 'neutral_sentiment', 'dominance_peak'],
    fearGreedRange: [40, 55],
  },
  {
    period: 'January 2021',
    description: 'Early bull acceleration — BTC broke previous ATH of $20K and surged to $40K. Institutional FOMO (MicroStrategy, Tesla) was accelerating. Fear & Greed was at 75-90. DeFi TVL was expanding rapidly. Altseason had not yet started — BTC dominance was still high.',
    tags: ['risk-on', 'early_bull', 'mid_bull', 'institutional_fomo', 'btc_dominance_high'],
    fearGreedRange: [70, 95],
  },
  {
    period: 'April-May 2021',
    description: 'Mid-cycle distribution and crash — BTC hit $64K then crashed 50% to $30K after China mining ban and Elon Musk FUD. First major shakeout of the cycle. Extreme greed flipped to extreme fear in weeks. Altcoins crashed 60-80%. DeFi TVL dropped sharply.',
    tags: ['distribution', 'mid_cycle_crash', 'euphoric', 'late_bull'],
    fearGreedRange: [10, 30],
  },
  {
    period: 'September-October 2021',
    description: 'Second wind rally — BTC recovered from $30K summer lows to push toward new ATH at $69K. Altseason was in full swing. Meme coins, GameFi, and metaverse tokens surged. Fear & Greed was back at extreme greed. DeFi TVL hit all-time highs. This was the last major move up before the bear.',
    tags: ['risk-on', 'late_bull', 'altseason', 'euphoric', 'defi_expanding'],
    fearGreedRange: [65, 90],
  },
  {
    period: 'November 2021',
    description: 'Peak euphoria and distribution — BTC hit ATH at $69K, total crypto market cap peaked near $3T. Extreme greed dominated. Every narrative — DeFi, NFTs, GameFi, L1s — was simultaneously overheated. Classic distribution: insiders selling to retail FOMO. This was the exact top.',
    tags: ['euphoric', 'distribution', 'late_bull', 'peak', 'extreme_greed'],
    fearGreedRange: [75, 100],
  },
  {
    period: 'January 2022',
    description: 'Post-ATH distribution and denial — BTC slid from $69K to $42K. Market was in denial — most expected a recovery. Fear & Greed dropped to 20s. Fed rate hike expectations were building. DeFi TVL was starting to leak. BTC dominance was rising as alts bled faster.',
    tags: ['risk-off', 'early_bear', 'denial', 'dominance_rising', 'macro_headwind'],
    fearGreedRange: [15, 35],
  },
  {
    period: 'May-June 2022',
    description: 'Terra/Luna collapse and contagion — UST depeg destroyed $40B in value. BTC crashed from $30K to $17K. Three Arrows Capital, Celsius, and Voyager collapsed. Fear & Greed hit single digits. DeFi TVL collapsed 70% from peak. This was the most destructive contagion event since Mt. Gox.',
    tags: ['capitulation', 'contagion', 'extreme_fear', 'defi_collapsing', 'mid_bear'],
    fearGreedRange: [5, 20],
  },
  {
    period: 'November 2022',
    description: 'FTX collapse — final capitulation — BTC crashed to $15.5K. The FTX/Alameda fraud revealed a house of cards. Fear & Greed was at extreme fear for weeks. Trust in centralized exchanges cratered. Yet this marked the absolute cycle bottom. Accumulation by long-term holders was at record levels.',
    tags: ['capitulation', 'late_bear', 'extreme_fear', 'cycle_bottom', 'accumulation'],
    fearGreedRange: [5, 20],
  },
  {
    period: 'January-March 2023',
    description: 'Early recovery accumulation — BTC rallied from $16K to $28K, catching most off guard. Banking crisis (SVB, Signature) paradoxically boosted crypto narrative. Fear & Greed moved from fear to neutral. DeFi TVL was stabilizing. Long-term holders were not selling. Classic early accumulation.',
    tags: ['accumulation', 'early_bull', 'recovery', 'neutral_sentiment'],
    fearGreedRange: [30, 55],
  },
  {
    period: 'October-December 2023',
    description: 'Pre-ETF anticipation rally — BTC surged from $26K to $44K on Bitcoin spot ETF approval expectations. Fear & Greed moved to greed. Institutional narratives dominated. DeFi TVL was slowly recovering. This was the "wall of worry" climb that preceded the ETF-driven breakout.',
    tags: ['risk-on', 'early_bull', 'institutional', 'anticipation'],
    fearGreedRange: [55, 75],
  },
  {
    period: 'March 2024',
    description: 'ETF-driven new ATH — BTC hit $73K driven by massive spot ETF inflows. Fear & Greed was at extreme greed. Meme coin mania returned (PEPE, WIF, BONK). DeFi TVL surged. This felt like a mid-cycle peak — euphoria was elevated but cycle was still relatively young post-halving.',
    tags: ['risk-on', 'mid_bull', 'euphoric', 'etf_driven', 'meme_mania'],
    fearGreedRange: [70, 95],
  },
  {
    period: 'January 2018',
    description: 'Post-ATH distribution — BTC hit $20K in Dec 2017, then began a 12-month decline to $3.2K. Retail euphoria from the ICO boom was giving way to reality. Fear & Greed was declining from extreme greed. Most alts lost 90-95% over the following year. Classic post-mania distribution.',
    tags: ['distribution', 'early_bear', 'post_euphoria', 'retail_exit'],
    fearGreedRange: [30, 60],
  },
  {
    period: 'December 2018',
    description: 'Cycle bottom capitulation — BTC bottomed at $3.2K after a year-long decline from $20K. Fear & Greed was at extreme fear. Mining was unprofitable. ICO projects were dead. Yet this was the accumulation zone — BTC would 20x over the next 3 years.',
    tags: ['capitulation', 'late_bear', 'extreme_fear', 'cycle_bottom', 'accumulation'],
    fearGreedRange: [5, 20],
  },
];

export function matchHistoricalAnalog(context: AnalogContext): string {
  let bestMatch = HISTORICAL_ANALOGS[0];
  let bestScore = -1;

  for (const analog of HISTORICAL_ANALOGS) {
    let score = 0;

    // Regime match
    if (context.regime) {
      if (analog.tags.includes(context.regime)) score += 3;
    }

    // Fear & Greed range match
    if (context.fearGreed !== undefined) {
      if (context.fearGreed >= analog.fearGreedRange[0] && context.fearGreed <= analog.fearGreedRange[1]) {
        score += 4;
      }
    }

    // Cycle phase match
    if (context.cyclePhase) {
      if (analog.tags.includes(context.cyclePhase)) score += 3;
    }

    // BTC dominance trend match
    if (context.btcDominanceTrend === 'rising' && analog.tags.includes('dominance_rising')) score += 2;
    if (context.btcDominanceTrend === 'falling' && analog.tags.includes('altseason')) score += 2;

    // DeFi TVL trend match
    if (context.defiTvlTrend === 'collapsing' && analog.tags.includes('defi_collapsing')) score += 2;
    if (context.defiTvlTrend === 'expanding' && analog.tags.includes('defi_expanding')) score += 2;

    // Macro match
    if (context.macroImpact === 'strong_headwind' && analog.tags.includes('macro_headwind')) score += 2;

    // Specific signal combos
    if (context.regime === 'capitulation' && analog.tags.includes('cycle_bottom')) score += 3;
    if (context.regime === 'euphoric' && analog.tags.includes('peak')) score += 3;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = analog;
    }
  }

  return `${bestMatch.period} — ${bestMatch.description}`;
}
