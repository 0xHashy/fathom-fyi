import { getRecentSignals } from '../storage/signal-store.js';
import { getAccuracyStats, computeAccuracyStats, type AccuracyStats } from '../storage/accuracy-tracker.js';
import type { ErrorOutput } from '../types/index.js';

export interface SignalHistoryOutput {
  recent_signals: {
    timestamp: string;
    tool: string;
    regime?: string;
    posture?: string;
    risk_score?: number;
    fear_greed?: number;
    accuracy_verdict?: string;
  }[];
  accuracy: AccuracyStats | null;
  total_signals_logged: number;
  agent_guidance: string;
}

export function getSignalHistory(limit = 20): SignalHistoryOutput | ErrorOutput {
  try {
    const signals = getRecentSignals(limit);

    // Recompute accuracy stats
    const accuracy = signals.length > 0 ? computeAccuracyStats() : getAccuracyStats();

    const recent = signals.map(s => ({
      timestamp: s.timestamp,
      tool: s.tool,
      regime: s.regime,
      posture: s.posture,
      risk_score: s.risk_score,
      fear_greed: s.fear_greed,
      accuracy_verdict: s.accuracy?.verdict,
    }));

    let guidance = `${signals.length} signals logged. `;
    if (accuracy && accuracy.evaluated_signals > 0) {
      guidance += `Accuracy: ${accuracy.win_rate_pct}% win rate across ${accuracy.evaluated_signals} evaluated signals. `;
      if (accuracy.win_rate_pct > 65) {
        guidance += 'Fathom signals have been historically reliable. Weight them in your decision-making.';
      } else if (accuracy.win_rate_pct > 50) {
        guidance += 'Fathom signals show positive edge but use them as one input among many.';
      } else {
        guidance += 'Accuracy data is still building. More signals needed for reliable statistics.';
      }
    } else {
      guidance += 'Accuracy tracking requires 2+ weeks of signal history to evaluate outcomes. Keep calling Fathom to build your proprietary track record.';
    }

    return {
      recent_signals: recent,
      accuracy,
      total_signals_logged: signals.length,
      agent_guidance: guidance,
    };
  } catch {
    return {
      error: true,
      error_source: 'get_signal_history',
      agent_guidance: 'Signal history temporarily unavailable.',
      last_known_data: null,
      data_warnings: ['Signal history service temporarily unavailable.'],
    };
  }
}
