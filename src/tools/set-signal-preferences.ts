import { setPreferences, type SignalPreferences } from '../storage/preferences-store.js';
import { createHash } from 'crypto';

const AGENT_ID = process.env.FATHOM_AGENT_ID ??
  createHash('sha256').update(process.env.CG_API_KEY ?? 'anonymous').digest('hex').slice(0, 12);

export interface SetPreferencesInput {
  cycle?: boolean;
  defi?: boolean;
  macro?: boolean;
  onchain?: boolean;
  narratives?: boolean;
  weather?: boolean;
  political_cycle?: boolean;
  seasonality?: boolean;
  macro_calendar?: boolean;
}

export interface SetPreferencesResult {
  success: boolean;
  agent_id: string;
  preferences: SignalPreferences;
  agent_guidance: string;
}

export function setSignalPreferencesTool(input: SetPreferencesInput): SetPreferencesResult {
  const stored = setPreferences(AGENT_ID, input);

  const enabled = Object.entries(stored.preferences)
    .filter(([, v]) => v === true)
    .map(([k]) => k);
  const disabled = Object.entries(stored.preferences)
    .filter(([, v]) => v === false)
    .map(([k]) => k);

  let guidance = `Signal preferences saved. ${enabled.length} signals enabled. `;
  if (disabled.length > 0) {
    guidance += `Disabled: ${disabled.join(', ')}. `;
  }
  guidance += 'These preferences apply to all future get_reality_check calls. Regime and sentiment are always included. Call set_signal_preferences again to change.';

  return {
    success: true,
    agent_id: AGENT_ID,
    preferences: stored.preferences,
    agent_guidance: guidance,
  };
}
