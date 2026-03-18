import type { ErrorOutput } from '../types/index.js';
import type { CacheService } from '../cache/cache-service.js';
import { BUILTIN_STRATEGIES, evaluateStrategy, type StrategyEvaluation, type StrategyDefinition } from '../intelligence/strategy-engine.js';
import { extractCurrentValues } from '../intelligence/alert-evaluator.js';
import { getStrategy } from '../storage/strategy-store.js';
import { getRealityCheck } from './get-reality-check.js';
import { createHash } from 'crypto';

const AGENT_ID = process.env.FATHOM_AGENT_ID ??
  createHash('sha256').update(process.env.CG_API_KEY ?? 'anonymous').digest('hex').slice(0, 12);

export async function evaluateStrategyTool(cache: CacheService, strategyName: string): Promise<StrategyEvaluation | ErrorOutput> {
  // Find strategy — check builtins first, then custom
  let strategy: StrategyDefinition | null = BUILTIN_STRATEGIES.find(s => s.name === strategyName) ?? null;

  if (!strategy) {
    const custom = getStrategy(AGENT_ID, strategyName);
    if (custom) {
      strategy = {
        name: custom.name,
        description: `Custom strategy: ${custom.name}`,
        conditions: custom.conditions,
        action_when_met: 'execute',
        action_when_not_met: 'wait',
      };
    }
  }

  if (!strategy) {
    const available = BUILTIN_STRATEGIES.map(s => s.name).join(', ');
    return {
      error: true, error_source: 'evaluate_strategy',
      agent_guidance: `Strategy "${strategyName}" not found. Available built-in strategies: ${available}. You can also create custom strategies with set_custom_strategy.`,
      last_known_data: null, data_warnings: [`Unknown strategy: ${strategyName}`],
    };
  }

  try {
    const reality = await getRealityCheck(cache);
    const currentValues = extractCurrentValues(reality as unknown as Record<string, unknown>);
    return evaluateStrategy(strategy, currentValues);
  } catch {
    return {
      error: true, error_source: 'evaluate_strategy',
      agent_guidance: 'Strategy evaluation temporarily unavailable. Retry shortly.',
      last_known_data: null, data_warnings: ['Strategy evaluation service temporarily unavailable.'],
    };
  }
}
