import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { ConditionOperator } from '../intelligence/alert-evaluator.js';

export interface CustomStrategy {
  name: string;
  conditions: Array<{ field: string; operator: ConditionOperator; threshold: string | number }>;
  created_at: string;
}

export interface StoredStrategies {
  agent_id: string;
  strategies: CustomStrategy[];
  updated_at: string;
}

const DATA_DIR = process.env.FATHOM_DATA_DIR ?? './data';
const STRAT_DIR = join(DATA_DIR, 'strategies');

function ensureDir(): void {
  if (!existsSync(STRAT_DIR)) mkdirSync(STRAT_DIR, { recursive: true });
}

function filePath(agentId: string): string {
  const safe = agentId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  return join(STRAT_DIR, `${safe}.json`);
}

export function setStrategy(agentId: string, strategy: CustomStrategy): void {
  ensureDir();
  const existing = getStrategies(agentId);
  const strategies = existing ? existing.strategies.filter(s => s.name !== strategy.name) : [];
  strategies.push(strategy);
  const stored: StoredStrategies = { agent_id: agentId, strategies, updated_at: new Date().toISOString() };
  writeFileSync(filePath(agentId), JSON.stringify(stored, null, 2), 'utf-8');
}

export function getStrategies(agentId: string): StoredStrategies | null {
  const fp = filePath(agentId);
  if (!existsSync(fp)) return null;
  try { return JSON.parse(readFileSync(fp, 'utf-8')) as StoredStrategies; } catch { return null; }
}

export function getStrategy(agentId: string, name: string): CustomStrategy | null {
  const stored = getStrategies(agentId);
  if (!stored) return null;
  return stored.strategies.find(s => s.name === name) ?? null;
}
