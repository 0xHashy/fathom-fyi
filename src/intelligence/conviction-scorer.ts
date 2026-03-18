export interface ConvictionScore {
  score: number;
  direction: 'bullish' | 'bearish' | 'neutral';
  strongest_signals: string[];
  conflicting_signals: string[];
  conviction_label: 'very_high' | 'high' | 'moderate' | 'low' | 'conflicted';
}

interface ConvictionInput {
  regime?: string;
  fearGreed?: number;
  cyclePhase?: string;
  macroImpact?: string;
  defiTrend?: string;
  onchainActivity?: string;
  mempoolCongestion?: string;
  btcDominanceTrend?: string;
  riskScore?: number;
}

export function calculateConvictionScore(input: ConvictionInput): ConvictionScore {
  const bullishSignals: string[] = [];
  const bearishSignals: string[] = [];

  // Regime
  if (input.regime === 'euphoric' || input.regime === 'risk-on') {
    bullishSignals.push(`Market regime: ${input.regime}`);
  } else if (input.regime === 'capitulation' || input.regime === 'risk-off') {
    bearishSignals.push(`Market regime: ${input.regime}`);
  }

  // Sentiment
  if (input.fearGreed !== undefined) {
    if (input.fearGreed > 70) bullishSignals.push(`Fear/Greed at ${input.fearGreed} — greed territory`);
    else if (input.fearGreed < 30) bearishSignals.push(`Fear/Greed at ${input.fearGreed} — fear territory`);
    // Contrarian layer
    if (input.fearGreed < 15) bullishSignals.push('Extreme fear — contrarian buy signal');
    if (input.fearGreed > 85) bearishSignals.push('Extreme greed — contrarian sell signal');
  }

  // Cycle
  if (input.cyclePhase) {
    if (['early_bull', 'mid_bull', 'accumulation'].includes(input.cyclePhase)) {
      bullishSignals.push(`Cycle phase: ${input.cyclePhase}`);
    } else if (['late_bull', 'early_bear', 'mid_bear'].includes(input.cyclePhase)) {
      bearishSignals.push(`Cycle phase: ${input.cyclePhase}`);
    }
  }

  // Macro
  if (input.macroImpact === 'tailwind') {
    bullishSignals.push('Macro environment: tailwind');
  } else if (input.macroImpact === 'headwind' || input.macroImpact === 'strong_headwind') {
    bearishSignals.push(`Macro environment: ${input.macroImpact}`);
  }

  // DeFi
  if (input.defiTrend === 'expanding') {
    bullishSignals.push('DeFi TVL expanding — on-chain growth');
  } else if (input.defiTrend === 'contracting' || input.defiTrend === 'collapsing') {
    bearishSignals.push(`DeFi TVL ${input.defiTrend}`);
  }

  // On-chain
  if (input.onchainActivity === 'high') {
    bullishSignals.push('High on-chain activity');
  } else if (input.onchainActivity === 'low') {
    bearishSignals.push('Low on-chain activity — reduced interest');
  }

  // BTC dominance
  if (input.btcDominanceTrend === 'falling') {
    bullishSignals.push('BTC dominance falling — risk appetite for alts');
  } else if (input.btcDominanceTrend === 'rising') {
    bearishSignals.push('BTC dominance rising — flight to safety');
  }

  const totalSignals = bullishSignals.length + bearishSignals.length;
  if (totalSignals === 0) {
    return {
      score: 50,
      direction: 'neutral',
      strongest_signals: ['Insufficient data for conviction assessment'],
      conflicting_signals: [],
      conviction_label: 'low',
    };
  }

  const bullishRatio = bullishSignals.length / totalSignals;
  const bearishRatio = bearishSignals.length / totalSignals;

  let direction: 'bullish' | 'bearish' | 'neutral';
  let score: number;

  if (bullishRatio > 0.65) {
    direction = 'bullish';
    score = Math.round(50 + bullishRatio * 50);
  } else if (bearishRatio > 0.65) {
    direction = 'bearish';
    score = Math.round(50 + bearishRatio * 50);
  } else {
    direction = 'neutral';
    score = Math.round(30 + Math.abs(bullishRatio - bearishRatio) * 40);
  }

  // Identify conflicts
  const conflicting: string[] = [];
  if (bullishSignals.length > 0 && bearishSignals.length > 0) {
    // The minority side signals are the conflicts
    const minority = bullishSignals.length < bearishSignals.length ? bullishSignals : bearishSignals;
    conflicting.push(...minority);
  }

  const strongest = direction === 'bullish' ? bullishSignals : direction === 'bearish' ? bearishSignals : [...bullishSignals, ...bearishSignals];

  let label: ConvictionScore['conviction_label'];
  if (conflicting.length > totalSignals * 0.4) label = 'conflicted';
  else if (score >= 85) label = 'very_high';
  else if (score >= 70) label = 'high';
  else if (score >= 55) label = 'moderate';
  else label = 'low';

  return {
    score: Math.min(100, Math.max(0, score)),
    direction,
    strongest_signals: strongest.slice(0, 5),
    conflicting_signals: conflicting.slice(0, 3),
    conviction_label: label,
  };
}
