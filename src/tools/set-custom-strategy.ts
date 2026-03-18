import { setStrategy } from '../storage/strategy-store.js';
import type { ConditionOperator } from '../intelligence/alert-evaluator.js';
import { createHash } from 'crypto';

const AGENT_ID = process.env.FATHOM_AGENT_ID ??
  createHash('sha256').update(process.env.CG_API_KEY ?? 'anonymous').digest('hex').slice(0, 12);

export interface SetStrategyInput {
  name: string;
  conditions: Array<{ field: string; operator: string; threshold: string | number }>;
}

export interface SetStrategyResult {
  success: boolean;
  agent_id: string;
  strategy_name: string;
  conditions_count: number;
  agent_guidance: string;
}

export function setCustomStrategyTool(input: SetStrategyInput): SetStrategyResult {
  const validated = input.conditions
    .filter(c => c.field && c.operator && c.threshold !== undefined)
    .map(c => ({
      field: c.field,
      operator: c.operator as ConditionOperator,
      threshold: c.threshold,
    }));

  setStrategy(AGENT_ID, {
    name: input.name,
    conditions: validated,
    created_at: new Date().toISOString(),
  });

  return {
    success: true,
    agent_id: AGENT_ID,
    strategy_name: input.name,
    conditions_count: validated.length,
    agent_guidance: `Custom strategy "${input.name}" saved with ${validated.length} conditions. Call evaluate_strategy with strategy: "${input.name}" to evaluate against current market conditions.`,
  };
}
