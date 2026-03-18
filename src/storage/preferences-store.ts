import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface SignalPreferences {
  // Core signals (always included, can't be turned off)
  regime: true;
  sentiment: true;
  // Configurable signals
  cycle: boolean;
  defi: boolean;
  macro: boolean;
  onchain: boolean;
  narratives: boolean;
  // Alternative signals
  weather: boolean;
  political_cycle: boolean;
  seasonality: boolean;
  macro_calendar: boolean;
}

export interface StoredPreferences {
  agent_id: string;
  preferences: SignalPreferences;
  updated_at: string;
}

const DEFAULT_PREFERENCES: SignalPreferences = {
  regime: true,
  sentiment: true,
  cycle: true,
  defi: true,
  macro: true,
  onchain: true,
  narratives: true,
  weather: true,
  political_cycle: true,
  seasonality: true,
  macro_calendar: true,
};

const DATA_DIR = process.env.FATHOM_DATA_DIR ?? './data';
const PREF_DIR = join(DATA_DIR, 'preferences');

function ensureDir(): void {
  if (!existsSync(PREF_DIR)) mkdirSync(PREF_DIR, { recursive: true });
}

function filePath(agentId: string): string {
  const safe = agentId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  return join(PREF_DIR, `${safe}.json`);
}

export function setPreferences(agentId: string, overrides: Partial<SignalPreferences>): StoredPreferences {
  ensureDir();
  const prefs: SignalPreferences = {
    ...DEFAULT_PREFERENCES,
    ...overrides,
    regime: true,   // always on
    sentiment: true, // always on
  };
  const stored: StoredPreferences = { agent_id: agentId, preferences: prefs, updated_at: new Date().toISOString() };
  writeFileSync(filePath(agentId), JSON.stringify(stored, null, 2), 'utf-8');
  return stored;
}

export function getPreferences(agentId: string): SignalPreferences {
  const fp = filePath(agentId);
  if (!existsSync(fp)) return DEFAULT_PREFERENCES;
  try {
    const stored = JSON.parse(readFileSync(fp, 'utf-8')) as StoredPreferences;
    return { ...DEFAULT_PREFERENCES, ...stored.preferences, regime: true, sentiment: true };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}
