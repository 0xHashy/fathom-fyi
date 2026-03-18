import { appendFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface SignalLogEntry {
  id: string;
  timestamp: string;
  tool: string;
  agent_id: string;
  tier: string;
  input_params: Record<string, unknown>;
  regime?: string;
  posture?: string;
  risk_score?: number;
  opportunity_score?: number;
  fear_greed?: number;
  btc_price_at_signal?: number;
  accuracy?: AccuracyOutcome | null;
}

export interface AccuracyOutcome {
  evaluated_at: string;
  btc_price_at_evaluation: number;
  btc_change_pct: number;
  fear_greed_at_evaluation: number;
  fear_greed_change: number;
  posture_correct: boolean;
  verdict: 'correct' | 'incorrect' | 'neutral';
}

const DATA_DIR = process.env.FATHOM_DATA_DIR ?? './data';
const SIGNALS_FILE = join(DATA_DIR, 'signals.jsonl');

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

let counter = 0;

function generateId(): string {
  counter++;
  return `sig_${Date.now()}_${counter}`;
}

export function appendSignal(entry: Omit<SignalLogEntry, 'id'>): string {
  ensureDataDir();
  const id = generateId();
  const full: SignalLogEntry = { id, ...entry };
  appendFileSync(SIGNALS_FILE, JSON.stringify(full) + '\n', 'utf-8');
  return id;
}

export function getRecentSignals(limit = 50): SignalLogEntry[] {
  if (!existsSync(SIGNALS_FILE)) return [];
  const lines = readFileSync(SIGNALS_FILE, 'utf-8')
    .trim()
    .split('\n')
    .filter(Boolean);

  const entries: SignalLogEntry[] = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line) as SignalLogEntry);
    } catch {
      // skip malformed lines
    }
  }

  return entries.slice(-limit);
}

export function getAllSignals(): SignalLogEntry[] {
  return getRecentSignals(Infinity);
}

export function getUniqueAgentCount(hours = 24): number {
  const cutoff = Date.now() - hours * 3600_000;
  const signals = getAllSignals();
  const agents = new Set<string>();
  for (const s of signals) {
    if (new Date(s.timestamp).getTime() > cutoff) {
      agents.add(s.agent_id);
    }
  }
  return agents.size;
}
