import type { CyclePosition, PriceTrend, VolumeHealth, TemporalCyclePhase } from '../types/index.js';

// ─── Asset Cycle Position ───

interface CycleInput {
  currentPrice: number;
  sma30: number;
  sma90: number;
  recentHigh: number;
  volumeTrend: 'rising' | 'falling' | 'stable';
}

export function determineCyclePosition(input: CycleInput): CyclePosition {
  const { currentPrice, sma30, sma90, recentHigh, volumeTrend } = input;

  // Markup: price > 30d SMA > 90d SMA
  if (currentPrice > sma30 && sma30 > sma90) {
    return 'markup';
  }

  // Distribution: price < recent high by >15% but > 30d SMA
  if (currentPrice < recentHigh * 0.85 && currentPrice > sma30) {
    return 'distribution';
  }

  // Markdown: price < 30d SMA < 90d SMA
  if (currentPrice < sma30 && sma30 < sma90) {
    return 'markdown';
  }

  // Accumulation: price < 30d SMA, volume declining
  if (currentPrice < sma30 && volumeTrend === 'falling') {
    return 'accumulation';
  }

  // Default fallback based on price vs SMA relationship
  if (currentPrice > sma30) return 'markup';
  return 'markdown';
}

// ─── Price Trend ───

export function determinePriceTrend(prices: number[]): PriceTrend {
  if (prices.length < 2) return 'sideways';

  const recentSlice = prices.slice(-7);
  const olderSlice = prices.slice(-14, -7);

  if (recentSlice.length === 0 || olderSlice.length === 0) return 'sideways';

  const recentAvg = recentSlice.reduce((a, b) => a + b, 0) / recentSlice.length;
  const olderAvg = olderSlice.reduce((a, b) => a + b, 0) / olderSlice.length;
  const pctChange = ((recentAvg - olderAvg) / olderAvg) * 100;

  if (pctChange > 15) return 'strong_uptrend';
  if (pctChange > 5) return 'uptrend';
  if (pctChange < -15) return 'strong_downtrend';
  if (pctChange < -5) return 'downtrend';
  return 'sideways';
}

// ─── Volume Health ───

export function determineVolumeHealth(currentVolume: number, avg30dVolume: number): VolumeHealth {
  if (avg30dVolume === 0) return 'normal';
  const ratio = currentVolume / avg30dVolume;
  if (ratio < 0.5) return 'thin';
  if (ratio <= 1.5) return 'normal';
  if (ratio <= 3) return 'elevated';
  return 'extreme';
}

// ─── Simple Moving Average ───

export function calculateSMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

// ─── Volume Trend ───

export function determineVolumeTrend(volumes: number[]): 'rising' | 'falling' | 'stable' {
  if (volumes.length < 14) return 'stable';
  const recent = volumes.slice(-7);
  const older = volumes.slice(-14, -7);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  const ratio = recentAvg / olderAvg;
  if (ratio > 1.3) return 'rising';
  if (ratio < 0.7) return 'falling';
  return 'stable';
}

// ─── Temporal Cycle Phase ───

const HALVING_DATES = [
  new Date('2012-11-28'),
  new Date('2016-07-09'),
  new Date('2020-05-11'),
  new Date('2024-04-19'),
];

const NEXT_HALVING_ESTIMATE = new Date('2028-04-01');

export function getTemporalCycleInfo(): {
  lastHalvingDate: string;
  nextHalvingEstimated: string;
  daysSinceLastHalving: number;
  daysUntilNextHalving: number;
  cycleProgressPercentage: number;
  estimatedCyclePhase: TemporalCyclePhase;
  phaseConfidence: number;
} {
  const now = new Date();
  const lastHalving = HALVING_DATES[HALVING_DATES.length - 1];
  const daysSince = Math.floor((now.getTime() - lastHalving.getTime()) / (1000 * 60 * 60 * 24));
  const daysUntil = Math.floor((NEXT_HALVING_ESTIMATE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const totalCycleDays = Math.floor((NEXT_HALVING_ESTIMATE.getTime() - lastHalving.getTime()) / (1000 * 60 * 60 * 24));
  const progress = Math.round((daysSince / totalCycleDays) * 100);

  let phase: TemporalCyclePhase;
  let confidence: number;

  if (daysSince <= 180) {
    phase = 'accumulation';
    confidence = 80;
  } else if (daysSince <= 365) {
    phase = 'early_bull';
    confidence = 75;
  } else if (daysSince <= 548) {
    phase = 'mid_bull';
    confidence = 70;
  } else if (daysSince <= 730) {
    phase = 'late_bull';
    confidence = 65;
  } else if (daysSince <= 912) {
    phase = 'early_bear';
    confidence = 60;
  } else if (daysSince <= 1095) {
    phase = 'mid_bear';
    confidence = 55;
  } else {
    phase = 'late_bear';
    confidence = 50;
  }

  return {
    lastHalvingDate: lastHalving.toISOString().split('T')[0],
    nextHalvingEstimated: NEXT_HALVING_ESTIMATE.toISOString().split('T')[0],
    daysSinceLastHalving: daysSince,
    daysUntilNextHalving: Math.max(0, daysUntil),
    cycleProgressPercentage: Math.min(progress, 100),
    estimatedCyclePhase: phase,
    phaseConfidence: confidence,
  };
}

// ─── Historical Cycle Analogs ───

export function getCycleAnalogs(daysSinceHalving: number): {
  cycle1: string;
  cycle2: string;
  cycle3: string;
  historicalPattern: string;
} {
  // Cycle 2: 2016 halving — 2016-07-09
  // At same point post-halving:
  const c2Date = new Date('2016-07-09');
  c2Date.setDate(c2Date.getDate() + daysSinceHalving);

  // Cycle 3: 2020 halving — 2020-05-11
  const c3Date = new Date('2020-05-11');
  c3Date.setDate(c3Date.getDate() + daysSinceHalving);

  // Cycle 1: 2012 halving — 2012-11-28
  const c1Date = new Date('2012-11-28');
  c1Date.setDate(c1Date.getDate() + daysSinceHalving);

  const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  let cycle1: string, cycle2: string, cycle3: string, historicalPattern: string;

  if (daysSinceHalving <= 180) {
    cycle1 = `Cycle 1 (${formatDate(c1Date)}): BTC was consolidating post-halving. Mining reward adjustment was being absorbed. Market was in quiet accumulation.`;
    cycle2 = `Cycle 2 (${formatDate(c2Date)}): BTC was range-bound $600-$700 in the months after the 2016 halving. Quiet accumulation before the 2017 bull run began.`;
    cycle3 = `Cycle 3 (${formatDate(c3Date)}): Post-2020 halving during COVID recovery. BTC was climbing from $9K. DeFi Summer was underway.`;
    historicalPattern = 'All prior cycles show 3-6 months of accumulation post-halving before significant upside begins. Patience has been historically rewarded.';
  } else if (daysSinceHalving <= 365) {
    cycle1 = `Cycle 1 (${formatDate(c1Date)}): BTC was beginning its first major rally from $12 toward $100+. Early believers were being validated.`;
    cycle2 = `Cycle 2 (${formatDate(c2Date)}): BTC was breaking out of its post-halving range, moving from $700 toward $1,000. The 2017 bull run was beginning.`;
    cycle3 = `Cycle 3 (${formatDate(c3Date)}): BTC was surging past $20K into price discovery. Institutional adoption (MicroStrategy, PayPal) was accelerating the move.`;
    historicalPattern = 'All prior cycles show the first major rally beginning 6-12 months post-halving. Early bull phase typically features 2-4x moves with relatively low retail participation.';
  } else if (daysSinceHalving <= 548) {
    cycle1 = `Cycle 1 (${formatDate(c1Date)}): BTC was in a parabolic move, surging toward its first major peak at $260. Retail discovery was underway.`;
    cycle2 = `Cycle 2 (${formatDate(c2Date)}): BTC was pushing from $1K toward $3K. ICO mania was building. Ethereum was gaining mainstream attention.`;
    cycle3 = `Cycle 3 (${formatDate(c3Date)}): BTC was in the $40K-$60K range. First major cycle top at $64K occurred. DeFi and NFT mania were at peak intensity.`;
    historicalPattern = 'Mid-bull phases in prior cycles featured the strongest percentage gains. However, this is also when first major corrections (30-40%) tend to occur. Volatility increases significantly.';
  } else if (daysSinceHalving <= 730) {
    cycle1 = `Cycle 1 (${formatDate(c1Date)}): BTC had peaked at $1,150 and was entering its first bear market. Early distribution was underway.`;
    cycle2 = `Cycle 2 (${formatDate(c2Date)}): BTC was in its final parabolic move toward $20K in Dec 2017. ICO mania peaked. Retail FOMO was at maximum.`;
    cycle3 = `Cycle 3 (${formatDate(c3Date)}): BTC made its final ATH at $69K in Nov 2021. NFTs, meme coins, and "everything rallies" marked the top.`;
    historicalPattern = 'Late bull phases show the highest absolute prices but also the highest risk. Historical cycle tops occur 18-24 months post-halving. Distribution by smart money accelerates.';
  } else if (daysSinceHalving <= 912) {
    cycle1 = `Cycle 1 (${formatDate(c1Date)}): BTC was in the early bear, declining from $1,150 peak. Market was in denial phase.`;
    cycle2 = `Cycle 2 (${formatDate(c2Date)}): BTC had crashed from $20K to $6K-$8K range. ICO projects were dying. Bear market was evident to all.`;
    cycle3 = `Cycle 3 (${formatDate(c3Date)}): BTC was in the $20K-$30K range after falling from $69K. Terra/Luna had collapsed. Contagion was spreading.`;
    historicalPattern = 'Early bear phases show initial 60-70% drawdown from cycle peak. Denial transitions to fear. Previous cycle narratives are discredited.';
  } else if (daysSinceHalving <= 1095) {
    cycle1 = `Cycle 1 (${formatDate(c1Date)}): BTC was bottoming in the $200-$300 range. Mining was barely profitable. Media declared Bitcoin dead.`;
    cycle2 = `Cycle 2 (${formatDate(c2Date)}): BTC was bottoming at $3.2K in Dec 2018. Maximum capitulation. "Crypto is dead" narratives dominated.`;
    cycle3 = `Cycle 3 (${formatDate(c3Date)}): BTC had bottomed at $15.5K after FTX collapse. Maximum pain. Long-term holders were accumulating at record pace.`;
    historicalPattern = 'Mid-bear to late-bear phase. Every prior cycle bottom occurred within this window. Maximum pessimism = maximum opportunity historically.';
  } else {
    cycle1 = `Cycle 1 (${formatDate(c1Date)}): BTC was in the pre-halving accumulation phase, slowly recovering from the cycle low.`;
    cycle2 = `Cycle 2 (${formatDate(c2Date)}): BTC was recovering from the $3.2K bottom, accumulating in the $3K-$6K range before the 2020 halving.`;
    cycle3 = `Cycle 3 (${formatDate(c3Date)}): BTC was in late bear recovery, building a base for the next cycle.`;
    historicalPattern = 'Late bear / pre-halving accumulation. Historically the highest risk-adjusted entry zone of the entire cycle.';
  }

  return { cycle1, cycle2, cycle3, historicalPattern };
}
