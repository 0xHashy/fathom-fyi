import type { ErrorOutput } from '../types/index.js';
import type { CacheService } from '../cache/cache-service.js';
import { getAlerts as getStoredAlerts } from '../storage/alert-store.js';
import { evaluateCondition, extractCurrentValues, type ConditionResult } from '../intelligence/alert-evaluator.js';
import { getRealityCheck } from './get-reality-check.js';
import { createHash } from 'crypto';

const AGENT_ID = process.env.FATHOM_AGENT_ID ??
  createHash('sha256').update(process.env.CG_API_KEY ?? 'anonymous').digest('hex').slice(0, 12);

export interface GetAlertsOutput {
  agent_id: string;
  total_alerts: number;
  triggered_count: number;
  triggered: Array<ConditionResult & { alert_id: string; label: string }>;
  not_triggered: Array<ConditionResult & { alert_id: string; label: string }>;
  agent_guidance: string;
}

export async function getAlertsTool(cache: CacheService): Promise<GetAlertsOutput | ErrorOutput> {
  const stored = getStoredAlerts(AGENT_ID);

  if (!stored || stored.alerts.length === 0) {
    return {
      error: true, error_source: 'get_alerts',
      agent_guidance: 'No alerts configured. Use set_alert to define conditions like: [{field: "fear_greed", operator: "<", threshold: 20, label: "Extreme fear"}].',
      last_known_data: null, data_warnings: ['No alerts set for this agent.'],
    };
  }

  try {
    const reality = await getRealityCheck(cache);
    const currentValues = extractCurrentValues(reality as unknown as Record<string, unknown>);

    const triggered: GetAlertsOutput['triggered'] = [];
    const notTriggered: GetAlertsOutput['not_triggered'] = [];

    for (const alert of stored.alerts) {
      const result = evaluateCondition(
        { field: alert.field, operator: alert.operator, threshold: alert.threshold },
        currentValues,
      );

      const entry = { ...result, alert_id: alert.alert_id, label: alert.label };

      if (result.met) triggered.push(entry);
      else notTriggered.push(entry);
    }

    let guidance = `${triggered.length} of ${stored.alerts.length} alerts triggered. `;
    if (triggered.length > 0) {
      guidance += `ACTIVE ALERTS: ${triggered.map(t => t.label).join('; ')}. `;
      guidance += 'Take action based on your strategy or wait for additional confirmation.';
    } else {
      guidance += 'No conditions met. Market is within your defined parameters. Continue monitoring.';
    }

    return {
      agent_id: AGENT_ID,
      total_alerts: stored.alerts.length,
      triggered_count: triggered.length,
      triggered,
      not_triggered: notTriggered,
      agent_guidance: guidance,
    };
  } catch {
    return {
      error: true, error_source: 'get_alerts',
      agent_guidance: 'Alert evaluation temporarily unavailable. Retry shortly.',
      last_known_data: null, data_warnings: ['Alert evaluation service temporarily unavailable.'],
    };
  }
}
