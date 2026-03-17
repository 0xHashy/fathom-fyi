import type { Regime } from '../types/index.js';

interface RegimeInput {
  fearGreed: number;
  btcDominance: number;
  btcDominancePrev?: number;
  marketCapChange24h: number;
  marketCapChange7d?: number;
  volumeSpike?: boolean;
}

interface RegimeResult {
  regime: Regime;
  confidence: number;
  evidence: string[];
}

export function classifyRegime(input: RegimeInput): RegimeResult {
  const evidence: string[] = [];
  const scores: Record<Regime, number> = {
    'euphoric': 0,
    'risk-on': 0,
    'transitional': 0,
    'risk-off': 0,
    'capitulation': 0,
  };

  const domTrend = input.btcDominancePrev !== undefined
    ? (input.btcDominance - input.btcDominancePrev > 1 ? 'rising' : input.btcDominance - input.btcDominancePrev < -1 ? 'falling' : 'neutral')
    : 'neutral';

  // ─── Euphoric signals ───
  if (input.fearGreed > 80) {
    scores.euphoric += 3;
    evidence.push(`Fear & Greed at ${input.fearGreed} (Extreme Greed)`);
  }
  if (input.marketCapChange24h > 5) {
    scores.euphoric += 2;
    evidence.push(`Market cap surging +${input.marketCapChange24h.toFixed(1)}% in 24h`);
  }
  if (input.marketCapChange7d !== undefined && input.marketCapChange7d > 20) {
    scores.euphoric += 3;
    evidence.push(`Market cap +${input.marketCapChange7d.toFixed(1)}% in 7d — parabolic move`);
  }

  // ─── Risk-on signals ───
  if (input.fearGreed > 60 && input.fearGreed <= 80) {
    scores['risk-on'] += 3;
    evidence.push(`Fear & Greed at ${input.fearGreed} (Greed) — risk appetite elevated`);
  }
  if (domTrend === 'falling') {
    scores['risk-on'] += 2;
    evidence.push('BTC dominance falling — capital rotating into alts (risk-on behavior)');
  }
  if (input.marketCapChange24h > 0 && input.marketCapChange24h <= 5) {
    scores['risk-on'] += 1;
    evidence.push('Total market cap expanding');
  }

  // ─── Transitional signals ───
  if (input.fearGreed >= 40 && input.fearGreed <= 60) {
    scores.transitional += 3;
    evidence.push(`Fear & Greed at ${input.fearGreed} — neutral zone, direction unclear`);
  }
  if (domTrend === 'neutral') {
    scores.transitional += 1;
  }
  if (Math.abs(input.marketCapChange24h) < 2) {
    scores.transitional += 1;
    evidence.push('Market cap relatively flat — no strong directional bias');
  }

  // ─── Risk-off signals ───
  if (input.fearGreed < 40 && input.fearGreed >= 20) {
    scores['risk-off'] += 3;
    evidence.push(`Fear & Greed at ${input.fearGreed} (Fear) — risk appetite declining`);
  }
  if (domTrend === 'rising') {
    scores['risk-off'] += 2;
    evidence.push('BTC dominance rising — capital rotating to safety');
  }
  if (input.marketCapChange24h < 0) {
    scores['risk-off'] += 1;
    evidence.push(`Market cap contracting ${input.marketCapChange24h.toFixed(1)}% in 24h`);
  }

  // ─── Capitulation signals ───
  if (input.fearGreed < 20) {
    scores.capitulation += 3;
    evidence.push(`Fear & Greed at ${input.fearGreed} (Extreme Fear) — capitulation territory`);
  }
  if (input.marketCapChange7d !== undefined && input.marketCapChange7d < -20) {
    scores.capitulation += 3;
    evidence.push(`Market cap collapsed ${input.marketCapChange7d.toFixed(1)}% in 7d`);
  }
  if (input.volumeSpike) {
    scores.capitulation += 2;
    evidence.push('Volume spike detected — panic selling signature');
  }
  if (input.marketCapChange24h < -10) {
    scores.capitulation += 2;
    evidence.push(`Market cap down ${input.marketCapChange24h.toFixed(1)}% in 24h — severe selling`);
  }

  // Find highest scoring regime
  let maxScore = 0;
  let regime: Regime = 'transitional';
  for (const [r, s] of Object.entries(scores)) {
    if (s > maxScore) {
      maxScore = s;
      regime = r as Regime;
    }
  }

  // Confidence = normalized score (max possible ~8)
  const confidence = Math.min(Math.round((maxScore / 8) * 100), 100);

  // If scores are close, default to transitional with lower confidence
  const sortedScores = Object.values(scores).sort((a, b) => b - a);
  if (sortedScores[0] > 0 && sortedScores[0] - sortedScores[1] <= 1) {
    regime = 'transitional';
    return { regime, confidence: Math.min(confidence, 50), evidence };
  }

  return { regime, confidence, evidence };
}

export function getBtcDominanceTrend(
  current: number,
  previous?: number,
): 'rising' | 'falling' | 'neutral' {
  if (previous === undefined) return 'neutral';
  const diff = current - previous;
  if (diff > 1) return 'rising';
  if (diff < -1) return 'falling';
  return 'neutral';
}
