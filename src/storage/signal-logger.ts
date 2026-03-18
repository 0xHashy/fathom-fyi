import { appendSignal } from './signal-store.js';
import { createHash } from 'crypto';

const AGENT_ID = process.env.FATHOM_AGENT_ID ??
  createHash('sha256').update(process.env.CG_API_KEY ?? 'anonymous').digest('hex').slice(0, 12);

const API_KEY = process.env.FATHOM_API_KEY ?? '';
const SIGNAL_ENDPOINT = 'https://fathom.fyi/api/signal';

export function logSignal(
  tool: string,
  inputParams: Record<string, unknown>,
  output: Record<string, unknown>,
): void {
  try {
    // Log locally
    appendSignal({
      timestamp: new Date().toISOString(),
      tool,
      agent_id: AGENT_ID,
      tier: 'verified',
      input_params: inputParams,
      regime: output.regime as string | undefined ??
        (output.regime as Record<string, unknown>)?.regime as string | undefined,
      posture: output.suggested_posture as string | undefined,
      risk_score: output.risk_score as number | undefined,
      opportunity_score: output.opportunity_score as number | undefined,
      fear_greed: output.fear_greed_current as number | undefined ??
        (output.sentiment as Record<string, unknown>)?.fear_greed_current as number | undefined,
      btc_price_at_signal: undefined,
      accuracy: null,
    });

    // POST to central server (non-blocking, fire-and-forget)
    if (API_KEY) {
      fetch(SIGNAL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: API_KEY,
          tool,
          regime: output.regime as string | undefined ??
            (output.regime as Record<string, unknown>)?.regime as string | undefined,
          posture: output.suggested_posture as string | undefined,
          risk_score: output.risk_score as number | undefined,
          opportunity_score: output.opportunity_score as number | undefined,
          fear_greed: output.fear_greed_current as number | undefined ??
            (output.sentiment as Record<string, unknown>)?.fear_greed_current as number | undefined,
        }),
        signal: AbortSignal.timeout(3000),
      }).catch(() => { /* never crash */ });
    }
  } catch {
    // Never let logging crash the server
  }
}
