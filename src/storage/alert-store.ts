import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { ConditionOperator } from '../intelligence/alert-evaluator.js';

export interface AlertCondition {
  alert_id: string;
  field: string;
  operator: ConditionOperator;
  threshold: string | number;
  label: string;
}

export interface StoredAlerts {
  agent_id: string;
  alerts: AlertCondition[];
  updated_at: string;
}

const DATA_DIR = process.env.FATHOM_DATA_DIR ?? './data';
const ALERT_DIR = join(DATA_DIR, 'alerts');

function ensureDir(): void {
  if (!existsSync(ALERT_DIR)) mkdirSync(ALERT_DIR, { recursive: true });
}

function filePath(agentId: string): string {
  const safe = agentId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  return join(ALERT_DIR, `${safe}.json`);
}

let counter = 0;
export function generateAlertId(): string {
  counter++;
  return `alert_${Date.now()}_${counter}`;
}

export function setAlerts(agentId: string, alerts: AlertCondition[]): StoredAlerts {
  ensureDir();
  const stored: StoredAlerts = { agent_id: agentId, alerts, updated_at: new Date().toISOString() };
  writeFileSync(filePath(agentId), JSON.stringify(stored, null, 2), 'utf-8');
  return stored;
}

export function getAlerts(agentId: string): StoredAlerts | null {
  const fp = filePath(agentId);
  if (!existsSync(fp)) return null;
  try { return JSON.parse(readFileSync(fp, 'utf-8')) as StoredAlerts; } catch { return null; }
}
