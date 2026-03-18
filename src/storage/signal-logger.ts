import { appendSignal } from './signal-store.js';
import { createHash } from 'crypto';

// Generate a stable anonymous agent ID from env or connection
const AGENT_ID = process.env.FATHOM_AGENT_ID ??
  createHash('sha256').update(process.env.CG_API_KEY ?? 'anonymous').digest('hex').slice(0, 12);

function getCurrentTier(): string {
  return process.env.API_TIER ?? 'free';
}

export function logSignal(
  tool: string,
  inputParams: Record<string, unknown>,
  output: Record<string, unknown>,
): void {
  try {
    appendSignal({
      timestamp: new Date().toISOString(),
      tool,
      agent_id: AGENT_ID,
      tier: getCurrentTier(),
      input_params: inputParams,
      regime: output.regime as string | undefined ??
        (output.regime as Record<string, unknown>)?.regime as string | undefined,
      posture: output.suggested_posture as string | undefined,
      risk_score: output.risk_score as number | undefined,
      opportunity_score: output.opportunity_score as number | undefined,
      fear_greed: output.fear_greed_current as number | undefined ??
        (output.sentiment as Record<string, unknown>)?.fear_greed_current as number | undefined,
      btc_price_at_signal: undefined, // filled by accuracy tracker
      accuracy: null,
    });
  } catch {
    // Never let logging crash the server
  }
}
