import type {
  Regime,
  TemporalCyclePhase,
  MacroCryptoImpact,
  TvlTrend,
  RiskEnvironment,
  SuggestedPosture,
} from '../types/index.js';

interface RiskScoreInput {
  fearGreed: number;
  regime: Regime;
  macroImpact: MacroCryptoImpact;
  defiTvlChange7d: number;
  yieldCurveInverted: boolean;
  cyclePhase: TemporalCyclePhase;
  defiTrend: TvlTrend;
}

export function calculateRiskScore(input: RiskScoreInput): number {
  let score = 50;

  // Sentiment extremes
  if (input.fearGreed < 25) score += 20;
  else if (input.fearGreed > 75) score += 15;

  // Regime
  if (input.regime === 'capitulation') score += 25;
  else if (input.regime === 'euphoric') score += 20;

  // Macro
  if (input.macroImpact === 'strong_headwind') score += 15;

  // DeFi TVL
  if (input.defiTvlChange7d < -10) score += 15;

  // Yield curve
  if (input.yieldCurveInverted) score += 10;

  // Cycle
  if (input.cyclePhase === 'late_bull') score += 15;

  // Positive adjustments
  if ((input.regime === 'risk-on') &&
    (input.cyclePhase === 'early_bull' || input.cyclePhase === 'mid_bull')) {
    score -= 15;
  }
  if (input.defiTrend === 'expanding') score -= 10;
  if (input.macroImpact === 'tailwind') score -= 10;

  return Math.max(0, Math.min(100, score));
}

export function calculateOpportunityScore(riskScore: number, fearGreed: number, regime: Regime): number {
  // Opportunity is inversely related to risk in many cases
  // but extreme fear = extreme opportunity
  let score = 100 - riskScore;

  // Contrarian: extreme fear is opportunity
  if (fearGreed < 20) score += 25;
  else if (fearGreed < 30) score += 15;

  // Capitulation often marks bottoms
  if (regime === 'capitulation') score += 20;

  // Euphoria limits opportunity
  if (regime === 'euphoric') score -= 20;

  return Math.max(0, Math.min(100, score));
}

export function getRiskEnvironment(riskScore: number): RiskEnvironment {
  if (riskScore <= 25) return 'green';
  if (riskScore <= 50) return 'yellow';
  if (riskScore <= 75) return 'orange';
  return 'red';
}

export function getSuggestedPosture(riskScore: number): SuggestedPosture {
  if (riskScore <= 25) return 'aggressive';
  if (riskScore <= 50) return 'moderate';
  if (riskScore <= 70) return 'defensive';
  return 'sideline';
}

export function generateExecutiveSummary(params: {
  regime: Regime;
  fearGreed: number;
  riskScore: number;
  cyclePhase: TemporalCyclePhase;
  posture: SuggestedPosture;
  macroImpact: MacroCryptoImpact;
  defiTrend: TvlTrend;
  btcDominanceTrend: 'rising' | 'falling' | 'neutral';
}): string {
  const { regime, fearGreed, riskScore, cyclePhase, posture, macroImpact, defiTrend, btcDominanceTrend } = params;

  const regimeDescriptions: Record<Regime, string> = {
    'euphoric': 'Markets are in euphoric territory with extreme greed dominating sentiment',
    'risk-on': 'Markets are in risk-on mode with healthy appetite for exposure',
    'transitional': 'Markets are in a transitional phase with mixed signals across indicators',
    'risk-off': 'Markets are in risk-off mode with capital rotating toward safety',
    'capitulation': 'Markets are in capitulation with extreme fear and widespread panic selling',
  };

  const cycleDescriptions: Record<string, string> = {
    'accumulation': 'Bitcoin cycle positioning suggests an accumulation phase',
    'early_bull': 'Bitcoin cycle positioning suggests early bull market conditions',
    'mid_bull': 'Bitcoin cycle positioning suggests mid-bull market conditions',
    'late_bull': 'Bitcoin cycle positioning suggests late-stage bull market with elevated reversal risk',
    'early_bear': 'Bitcoin cycle positioning suggests early bear market conditions',
    'mid_bear': 'Bitcoin cycle positioning suggests mid-bear with potential bottoming process',
    'late_bear': 'Bitcoin cycle positioning suggests late-bear exhaustion — historically a high-value accumulation zone',
  };

  const macroSentences: Record<MacroCryptoImpact, string> = {
    'tailwind': 'Macro conditions are providing a tailwind with favorable monetary policy.',
    'neutral': 'Macro backdrop is neutral — neither helping nor hurting crypto.',
    'headwind': 'Macro conditions present a headwind as monetary policy tightens.',
    'strong_headwind': 'Macro conditions are a significant headwind with aggressive monetary tightening.',
  };

  const defiNote = defiTrend === 'expanding' ? 'DeFi ecosystem is expanding, signaling healthy on-chain activity.'
    : defiTrend === 'collapsing' ? 'DeFi TVL is collapsing, indicating severe stress across protocols.'
    : defiTrend === 'contracting' ? 'DeFi TVL is contracting, suggesting declining confidence in on-chain yields.'
    : 'DeFi TVL is stable.';

  const postureInstruction = `Recommended posture: ${posture}. Risk score: ${riskScore}/100.`;

  return `${regimeDescriptions[regime]}. Fear & Greed Index at ${fearGreed}. ${cycleDescriptions[cyclePhase] ?? 'Cycle phase is uncertain.'}. ${macroSentences[macroImpact]} ${defiNote} ${postureInstruction}`;
}

export function generateKeyRisks(params: {
  regime: Regime;
  fearGreed: number;
  cyclePhase: TemporalCyclePhase;
  macroImpact: MacroCryptoImpact;
  defiTrend: TvlTrend;
  yieldCurveInverted: boolean;
}): string[] {
  const risks: string[] = [];

  if (params.regime === 'euphoric') risks.push('Extreme greed historically precedes sharp corrections — distribution risk is elevated');
  if (params.regime === 'capitulation') risks.push('Capitulation conditions mean further downside possible before stabilization');
  if (params.cyclePhase === 'late_bull') risks.push('Late-bull cycle positioning means the window for easy gains is closing');
  if (params.macroImpact === 'strong_headwind') risks.push('Aggressive monetary tightening is a direct headwind to risk asset valuations');
  if (params.macroImpact === 'headwind') risks.push('Tightening monetary conditions reduce liquidity available to flow into crypto');
  if (params.defiTrend === 'collapsing') risks.push('DeFi TVL collapse indicates protocol-level contagion risk');
  if (params.defiTrend === 'contracting') risks.push('Declining DeFi TVL suggests eroding confidence in on-chain yields');
  if (params.yieldCurveInverted) risks.push('Inverted yield curve signals elevated recession probability — risk assets vulnerable');
  if (params.fearGreed > 80) risks.push('Extreme greed sentiment is a contrarian warning — smart money typically distributes at these levels');
  if (params.regime === 'risk-off') risks.push('Risk-off regime means further downside likely before sentiment stabilizes');

  return risks.slice(0, 3);
}

export function generateKeyOpportunities(params: {
  regime: Regime;
  fearGreed: number;
  cyclePhase: TemporalCyclePhase;
  macroImpact: MacroCryptoImpact;
  defiTrend: TvlTrend;
}): string[] {
  const opportunities: string[] = [];

  if (params.fearGreed < 20) opportunities.push('Extreme fear is historically the strongest accumulation signal — prior instances preceded major rallies');
  if (params.fearGreed < 30 && params.fearGreed >= 20) opportunities.push('Fear zone historically offers better risk-adjusted entries than neutral or greed zones');
  if (params.regime === 'capitulation') opportunities.push('Capitulation phases have historically marked generational buying opportunities within 2-8 weeks');
  if (params.cyclePhase === 'accumulation') opportunities.push('Accumulation phase positioning — historically the highest risk-adjusted entry zone of the entire 4-year cycle');
  if (params.cyclePhase === 'early_bull') opportunities.push('Early bull phase — historically the period with the best forward 12-month returns');
  if (params.macroImpact === 'tailwind') opportunities.push('Macro tailwind (rate cuts / weak dollar) historically amplifies crypto bull runs');
  if (params.defiTrend === 'expanding') opportunities.push('Expanding DeFi TVL indicates growing on-chain economic activity — bullish for ecosystem tokens');
  if (params.regime === 'risk-on' && (params.cyclePhase === 'early_bull' || params.cyclePhase === 'mid_bull')) {
    opportunities.push('Risk-on regime aligned with early/mid-bull cycle — historically the strongest sustained rally conditions');
  }

  if (opportunities.length === 0) {
    opportunities.push('Current conditions do not present clear high-conviction opportunities — patience is a position');
  }

  return opportunities.slice(0, 3);
}
