import { setAlerts, generateAlertId, type AlertCondition } from '../storage/alert-store.js';
import { createHash } from 'crypto';

const AGENT_ID = process.env.FATHOM_AGENT_ID ??
  createHash('sha256').update(process.env.CG_API_KEY ?? 'anonymous').digest('hex').slice(0, 12);

const VALID_FIELDS = new Set([
  'fear_greed', 'risk_score', 'opportunity_score', 'regime', 'posture', 'suggested_posture',
  'cycle_phase', 'tvl_change_7d', 'defi_health_score', 'tvl_trend',
  'fed_funds_trend', 'dxy_trend', 'yield_curve_state', 'macro_crypto_impact',
  'recession_probability', 'btc_dominance', 'btc_dominance_trend',
  'mempool_congestion', 'onchain_activity', 'accelerating_narratives',
  'market_cap_change_24h', 'cycle_progress', 'days_since_halving', 'fear_greed_trend',
]);

const VALID_OPS = new Set(['<', '>', '<=', '>=', '==', '!=']);

export interface SetAlertInput {
  field: string;
  operator: string;
  threshold: string | number;
  label?: string;
}

export interface SetAlertResult {
  success: boolean;
  agent_id: string;
  alerts_count: number;
  updated_at: string;
  agent_guidance: string;
}

export function setAlertTool(alerts: SetAlertInput[]): SetAlertResult {
  const validated: AlertCondition[] = [];

  for (const a of alerts) {
    if (!VALID_FIELDS.has(a.field)) continue;
    if (!VALID_OPS.has(a.operator)) continue;

    validated.push({
      alert_id: generateAlertId(),
      field: a.field,
      operator: a.operator as AlertCondition['operator'],
      threshold: a.threshold,
      label: a.label ?? `${a.field} ${a.operator} ${a.threshold}`,
    });
  }

  const stored = setAlerts(AGENT_ID, validated);

  return {
    success: true,
    agent_id: AGENT_ID,
    alerts_count: validated.length,
    updated_at: stored.updated_at,
    agent_guidance: `${validated.length} alert${validated.length === 1 ? '' : 's'} configured. Call get_alerts to check which conditions are currently triggered. Alerts are evaluated against live market data on each call.`,
  };
}
