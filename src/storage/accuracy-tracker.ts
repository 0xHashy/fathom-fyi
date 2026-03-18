import { getAllSignals, type SignalLogEntry, type AccuracyOutcome } from './signal-store.js';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = process.env.FATHOM_DATA_DIR ?? './data';
const ACCURACY_FILE = join(DATA_DIR, 'accuracy.json');

export interface AccuracyStats {
  total_signals: number;
  evaluated_signals: number;
  correct: number;
  incorrect: number;
  neutral: number;
  win_rate_pct: number;
  by_posture: Record<string, { total: number; correct: number; win_rate_pct: number }>;
  by_regime: Record<string, { total: number; correct: number; win_rate_pct: number }>;
  last_evaluated: string;
}

export function computeAccuracyStats(): AccuracyStats {
  const signals = getAllSignals();

  const evaluated = signals.filter(s => s.accuracy?.verdict);
  const correct = evaluated.filter(s => s.accuracy?.verdict === 'correct').length;
  const incorrect = evaluated.filter(s => s.accuracy?.verdict === 'incorrect').length;
  const neutral = evaluated.filter(s => s.accuracy?.verdict === 'neutral').length;

  const byPosture: Record<string, { total: number; correct: number; win_rate_pct: number }> = {};
  const byRegime: Record<string, { total: number; correct: number; win_rate_pct: number }> = {};

  for (const s of evaluated) {
    if (s.posture) {
      if (!byPosture[s.posture]) byPosture[s.posture] = { total: 0, correct: 0, win_rate_pct: 0 };
      byPosture[s.posture].total++;
      if (s.accuracy?.verdict === 'correct') byPosture[s.posture].correct++;
    }
    if (s.regime) {
      if (!byRegime[s.regime]) byRegime[s.regime] = { total: 0, correct: 0, win_rate_pct: 0 };
      byRegime[s.regime].total++;
      if (s.accuracy?.verdict === 'correct') byRegime[s.regime].correct++;
    }
  }

  for (const v of Object.values(byPosture)) {
    v.win_rate_pct = v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0;
  }
  for (const v of Object.values(byRegime)) {
    v.win_rate_pct = v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0;
  }

  const stats: AccuracyStats = {
    total_signals: signals.length,
    evaluated_signals: evaluated.length,
    correct,
    incorrect,
    neutral,
    win_rate_pct: evaluated.length > 0 ? Math.round((correct / evaluated.length) * 100) : 0,
    by_posture: byPosture,
    by_regime: byRegime,
    last_evaluated: new Date().toISOString(),
  };

  try {
    writeFileSync(ACCURACY_FILE, JSON.stringify(stats, null, 2), 'utf-8');
  } catch {
    // non-critical
  }

  return stats;
}

export function getAccuracyStats(): AccuracyStats | null {
  if (!existsSync(ACCURACY_FILE)) return null;
  try {
    return JSON.parse(readFileSync(ACCURACY_FILE, 'utf-8')) as AccuracyStats;
  } catch {
    return null;
  }
}

// Evaluate a signal's accuracy given market outcomes
export function evaluateSignal(
  signal: SignalLogEntry,
  btcPriceNow: number,
  fearGreedNow: number,
): AccuracyOutcome {
  const btcPriceThen = signal.btc_price_at_signal ?? 0;
  const btcChangePct = btcPriceThen > 0
    ? ((btcPriceNow - btcPriceThen) / btcPriceThen) * 100
    : 0;
  const fgThen = signal.fear_greed ?? 50;
  const fgChange = fearGreedNow - fgThen;

  let postureCorrect = false;
  let verdict: 'correct' | 'incorrect' | 'neutral' = 'neutral';

  if (signal.posture === 'aggressive' || signal.posture === 'moderate') {
    // Bullish posture — correct if market went up
    if (btcChangePct > 3) { postureCorrect = true; verdict = 'correct'; }
    else if (btcChangePct < -3) { verdict = 'incorrect'; }
  } else if (signal.posture === 'defensive' || signal.posture === 'sideline') {
    // Bearish posture — correct if market went down or stayed flat
    if (btcChangePct < -3) { postureCorrect = true; verdict = 'correct'; }
    else if (btcChangePct > 5) { verdict = 'incorrect'; }
  }

  return {
    evaluated_at: new Date().toISOString(),
    btc_price_at_evaluation: btcPriceNow,
    btc_change_pct: Math.round(btcChangePct * 100) / 100,
    fear_greed_at_evaluation: fearGreedNow,
    fear_greed_change: fgChange,
    posture_correct: postureCorrect,
    verdict,
  };
}
