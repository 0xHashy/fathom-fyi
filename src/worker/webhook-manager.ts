import type { RealityCheckOutput, ErrorOutput } from '../types/index.js';

// ─── Types ───

export interface WebhookCondition {
  field: string;
  operator: '<' | '>' | '<=' | '>=' | '==' | '!=';
  threshold: string | number;
}

export interface WebhookConfig {
  id: string;
  url: string;
  conditions: WebhookCondition[];
  label?: string;
  created_at: string;
  last_triggered?: string;
  trigger_count: number;
  cooldown_minutes: number;
}

// ─── Persistent storage via Fathom API (Upstash Redis) ───

const FATHOM_API_KEY = process.env.FATHOM_API_KEY ?? '';
const AGENT_ID = process.env.FATHOM_AGENT_ID ?? 'default';

// In-memory cache of webhooks (synced to/from server)
const webhooks = new Map<string, WebhookConfig>();
let initialized = false;

async function kvSet(key: string, value: unknown): Promise<void> {
  if (!FATHOM_API_KEY) return; // Free tier can't use webhooks anyway
  try {
    await fetch('https://fathom.fyi/api/kv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-fathom-key': FATHOM_API_KEY },
      body: JSON.stringify({ action: 'set', key, value }),
      signal: AbortSignal.timeout(5000),
    });
  } catch { /* non-blocking */ }
}

async function kvGet(key: string): Promise<unknown> {
  if (!FATHOM_API_KEY) return null;
  try {
    const res = await fetch(`https://fathom.fyi/api/kv?action=get&key=${encodeURIComponent(key)}`, {
      headers: { 'x-fathom-key': FATHOM_API_KEY },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { value?: unknown };
    return data.value ?? null;
  } catch { return null; }
}

async function loadWebhooks(): Promise<void> {
  if (initialized) return;
  const stored = await kvGet(`webhooks:${AGENT_ID}`) as WebhookConfig[] | null;
  if (stored && Array.isArray(stored)) {
    for (const wh of stored) webhooks.set(wh.id, wh);
  }
  initialized = true;
}

async function saveWebhooks(): Promise<void> {
  await kvSet(`webhooks:${AGENT_ID}`, Array.from(webhooks.values()));
}

// ─── Public API ───

export async function registerWebhook(config: Omit<WebhookConfig, 'id' | 'created_at' | 'trigger_count'>): Promise<WebhookConfig> {
  await loadWebhooks();
  const id = 'wh_' + crypto.randomUUID().slice(0, 12);
  const webhook: WebhookConfig = {
    ...config,
    id,
    created_at: new Date().toISOString(),
    trigger_count: 0,
  };
  webhooks.set(id, webhook);
  await saveWebhooks();
  return webhook;
}

export async function removeWebhook(id: string): Promise<boolean> {
  await loadWebhooks();
  const removed = webhooks.delete(id);
  if (removed) await saveWebhooks();
  return removed;
}

export async function listWebhooks(): Promise<WebhookConfig[]> {
  await loadWebhooks();
  return Array.from(webhooks.values());
}

// ─── Condition evaluation ───

function extractValue(data: RealityCheckOutput, field: string): string | number | null {
  const map: Record<string, () => string | number | null> = {
    'fear_greed': () => data.sentiment?.fear_greed_current ?? null,
    'risk_score': () => data.risk_score,
    'opportunity_score': () => data.opportunity_score,
    'regime': () => data.regime?.regime ?? null,
    'posture': () => data.suggested_posture,
    'risk_environment': () => data.overall_risk_environment,
    'btc_dominance': () => data.regime?.btc_dominance ?? null,
    'cycle_phase': () => data.cycle?.estimated_cycle_phase ?? null,
    'tvl_change_7d': () => data.defi?.tvl_change_7d ?? null,
    'defi_health': () => data.defi?.defi_health_score ?? null,
    'macro_impact': () => data.macro?.macro_crypto_impact ?? null,
    'fed_funds_rate': () => data.macro?.fed_funds_rate ?? null,
    'dxy_trend': () => data.macro?.dxy_trend ?? null,
    'net_flow_signal': () => data.stablecoin_flows?.net_flow_signal ?? null,
    'leverage_signal': () => data.derivatives?.leverage_signal ?? null,
    'btc_put_call': () => data.derivatives?.btc_put_call_ratio ?? null,
    'btc_sp500_correlation': () => data.tradfi_correlation?.btc_sp500_correlation ?? null,
    'macro_risk_appetite': () => data.tradfi_correlation?.macro_risk_appetite ?? null,
  };

  const getter = map[field];
  return getter ? getter() : null;
}

function evaluateCondition(value: string | number | null, condition: WebhookCondition): boolean {
  if (value === null) return false;

  const threshold = condition.threshold;
  const op = condition.operator;

  if (typeof value === 'string' || typeof threshold === 'string') {
    const a = String(value);
    const b = String(threshold);
    if (op === '==') return a === b;
    if (op === '!=') return a !== b;
    return false;
  }

  const a = Number(value);
  const b = Number(threshold);
  if (isNaN(a) || isNaN(b)) return false;

  switch (op) {
    case '<': return a < b;
    case '>': return a > b;
    case '<=': return a <= b;
    case '>=': return a >= b;
    case '==': return a === b;
    case '!=': return a !== b;
    default: return false;
  }
}

// ─── Webhook evaluation and delivery ───

export async function evaluateAndFireWebhooks(data: RealityCheckOutput | ErrorOutput): Promise<void> {
  if ((data as ErrorOutput).error === true) return;
  const realityCheck = data as RealityCheckOutput;

  await loadWebhooks();
  const now = Date.now();
  let changed = false;

  for (const webhook of webhooks.values()) {
    // Check cooldown
    if (webhook.last_triggered) {
      const lastFired = new Date(webhook.last_triggered).getTime();
      const cooldownMs = webhook.cooldown_minutes * 60_000;
      if (now - lastFired < cooldownMs) continue;
    }

    // Evaluate all conditions (ALL must be true)
    const allMet = webhook.conditions.every(cond => {
      const value = extractValue(realityCheck, cond.field);
      return evaluateCondition(value, cond);
    });

    if (!allMet) continue;

    // Fire webhook
    try {
      const payload = {
        event: 'condition_triggered',
        webhook_id: webhook.id,
        label: webhook.label ?? 'Fathom Alert',
        triggered_at: new Date().toISOString(),
        conditions_met: webhook.conditions.map(c => ({
          field: c.field,
          operator: c.operator,
          threshold: c.threshold,
          actual_value: extractValue(realityCheck, c.field),
        })),
        reality_check: {
          risk_score: realityCheck.risk_score,
          opportunity_score: realityCheck.opportunity_score,
          regime: realityCheck.regime?.regime,
          posture: realityCheck.suggested_posture,
          fear_greed: realityCheck.sentiment?.fear_greed_current,
          executive_summary: realityCheck.executive_summary,
        },
      };

      await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Fathom/4.3.0',
          'X-Fathom-Webhook-Id': webhook.id,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });

      webhook.last_triggered = new Date().toISOString();
      webhook.trigger_count++;
      changed = true;
    } catch {
      // Delivery failed — retry next cycle
    }
  }

  if (changed) await saveWebhooks();
}
