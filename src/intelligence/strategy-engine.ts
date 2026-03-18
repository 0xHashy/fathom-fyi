import { evaluateCondition, type ConditionResult } from './alert-evaluator.js';
import type { ConditionOperator } from './alert-evaluator.js';

export interface StrategyDefinition {
  name: string;
  description: string;
  conditions: Array<{ field: string; operator: ConditionOperator; threshold: string | number }>;
  action_when_met: 'execute' | 'wait' | 'exit';
  action_when_not_met: 'execute' | 'wait' | 'exit';
}

export const BUILTIN_STRATEGIES: StrategyDefinition[] = [
  {
    name: 'conservative_dca',
    description: 'Dollar-cost average only when risk is low, posture is favorable, and fear is elevated (contrarian entry).',
    conditions: [
      { field: 'risk_score', operator: '<', threshold: 40 },
      { field: 'fear_greed', operator: '<', threshold: 30 },
    ],
    action_when_met: 'execute',
    action_when_not_met: 'wait',
  },
  {
    name: 'momentum_rider',
    description: 'Enter positions when regime is risk-on and multiple sectors are accelerating.',
    conditions: [
      { field: 'regime', operator: '==', threshold: 'risk-on' },
      { field: 'accelerating_narratives', operator: '>', threshold: 3 },
    ],
    action_when_met: 'execute',
    action_when_not_met: 'wait',
  },
  {
    name: 'macro_aligned',
    description: 'Only act when macro conditions are favorable and yield curve is not inverted.',
    conditions: [
      { field: 'yield_curve_state', operator: '!=', threshold: 'inverted' },
      { field: 'macro_crypto_impact', operator: '!=', threshold: 'strong_headwind' },
    ],
    action_when_met: 'execute',
    action_when_not_met: 'wait',
  },
  {
    name: 'fear_accumulator',
    description: 'Accumulate during extreme fear, reduce during extreme greed. The classic contrarian strategy.',
    conditions: [
      { field: 'fear_greed', operator: '<', threshold: 20 },
    ],
    action_when_met: 'execute',
    action_when_not_met: 'wait',
  },
  {
    name: 'full_defensive',
    description: 'Exit all risk positions when risk score is elevated or regime is capitulation.',
    conditions: [
      { field: 'risk_score', operator: '>', threshold: 70 },
    ],
    action_when_met: 'exit',
    action_when_not_met: 'wait',
  },
];

export interface StrategyEvaluation {
  strategy_name: string;
  description: string;
  conditions_met: boolean;
  conditions_detail: Array<ConditionResult>;
  action: 'execute' | 'wait' | 'exit';
  agent_guidance: string;
}

export function evaluateStrategy(
  strategy: StrategyDefinition,
  currentValues: Record<string, string | number | null>,
): StrategyEvaluation {
  const details: ConditionResult[] = [];
  let allMet = true;

  for (const condition of strategy.conditions) {
    const result = evaluateCondition(condition, currentValues);
    details.push(result);
    if (!result.met) allMet = false;
  }

  const action = allMet ? strategy.action_when_met : strategy.action_when_not_met;

  let guidance = `Strategy "${strategy.name}": `;
  if (allMet) {
    guidance += `ALL conditions met. Action: ${action.toUpperCase()}. `;
    if (action === 'execute') guidance += 'Conditions are favorable for this strategy. Proceed with position sizing appropriate to your risk tolerance.';
    else if (action === 'exit') guidance += 'Exit conditions triggered. Reduce or close positions immediately.';
  } else {
    const unmet = details.filter(d => !d.met);
    guidance += `${unmet.length} condition${unmet.length === 1 ? '' : 's'} not met. Action: WAIT. `;
    guidance += `Unmet: ${unmet.map(u => `${u.field} is ${u.current_value} (need ${u.operator} ${u.threshold})`).join('; ')}.`;
  }

  return {
    strategy_name: strategy.name,
    description: strategy.description,
    conditions_met: allMet,
    conditions_detail: details,
    action,
    agent_guidance: guidance,
  };
}
