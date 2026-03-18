import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface WatchlistSnapshot {
  asset: string;
  cycle_position: string;
  risk_level: string;
  price_trend: string;
  volume_health: string;
  timestamp: string;
}

export interface StoredWatchlist {
  agent_id: string;
  snapshots: WatchlistSnapshot[];
  updated_at: string;
}

const DATA_DIR = process.env.FATHOM_DATA_DIR ?? './data';
const WL_DIR = join(DATA_DIR, 'watchlists');

function ensureDir(): void {
  if (!existsSync(WL_DIR)) mkdirSync(WL_DIR, { recursive: true });
}

function filePath(agentId: string): string {
  const safe = agentId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  return join(WL_DIR, `${safe}.json`);
}

export function saveWatchlistSnapshot(agentId: string, snapshots: WatchlistSnapshot[]): void {
  ensureDir();
  const stored: StoredWatchlist = { agent_id: agentId, snapshots, updated_at: new Date().toISOString() };
  writeFileSync(filePath(agentId), JSON.stringify(stored, null, 2), 'utf-8');
}

export function getWatchlistSnapshot(agentId: string): StoredWatchlist | null {
  const fp = filePath(agentId);
  if (!existsSync(fp)) return null;
  try { return JSON.parse(readFileSync(fp, 'utf-8')) as StoredWatchlist; } catch { return null; }
}
