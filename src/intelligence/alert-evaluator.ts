// Shared condition evaluation logic for alerts and strategies

export type ConditionOperator = '<' | '>' | '<=' | '>=' | '==' | '!=';

export interface ConditionRule {
  field: string;
  operator: ConditionOperator;
  threshold: string | number;
}

export interface ConditionResult {
  field: string;
  operator: ConditionOperator;
  threshold: string | number;
  current_value: string | number | null;
  met: boolean;
}

export function evaluateCondition(
  rule: ConditionRule,
  currentValues: Record<string, string | number | null>,
): ConditionResult {
  const current = currentValues[rule.field] ?? null;

  if (current === null) {
    return { ...rule, current_value: null, met: false };
  }

  // String comparison
  if (typeof rule.threshold === 'string' && typeof current === 'string') {
    const met = rule.operator === '==' ? current === rule.threshold
      : rule.operator === '!=' ? current !== rule.threshold
      : false;
    return { ...rule, current_value: current, met };
  }

  // Numeric comparison
  const numCurrent = typeof current === 'number' ? current : parseFloat(String(current));
  const numThreshold = typeof rule.threshold === 'number' ? rule.threshold : parseFloat(String(rule.threshold));

  if (isNaN(numCurrent) || isNaN(numThreshold)) {
    // Fall back to string equality for non-numeric
    const met = rule.operator === '==' ? String(current) === String(rule.threshold)
      : rule.operator === '!=' ? String(current) !== String(rule.threshold)
      : false;
    return { ...rule, current_value: current, met };
  }

  let met = false;
  switch (rule.operator) {
    case '<': met = numCurrent < numThreshold; break;
    case '>': met = numCurrent > numThreshold; break;
    case '<=': met = numCurrent <= numThreshold; break;
    case '>=': met = numCurrent >= numThreshold; break;
    case '==': met = numCurrent === numThreshold; break;
    case '!=': met = numCurrent !== numThreshold; break;
  }

  return { ...rule, current_value: current, met };
}

// Extract a flat map of current values from reality check output
export function extractCurrentValues(reality: Record<string, unknown>): Record<string, string | number | null> {
  const values: Record<string, string | number | null> = {};

  values.risk_score = reality.risk_score as number ?? null;
  values.opportunity_score = reality.opportunity_score as number ?? null;
  values.suggested_posture = reality.suggested_posture as string ?? null;
  values.posture = reality.suggested_posture as string ?? null;

  const regime = reality.regime as Record<string, unknown> | undefined;
  if (regime && typeof regime === 'object') {
    values.regime = regime.regime as string ?? null;
    values.fear_greed = regime.fear_greed_score as number ?? null;
    values.btc_dominance = regime.btc_dominance as number ?? null;
    values.btc_dominance_trend = regime.btc_dominance_trend as string ?? null;
    values.market_cap_change_24h = regime.market_cap_change_24h as number ?? null;
  }

  const sentiment = reality.sentiment as Record<string, unknown> | undefined;
  if (sentiment && typeof sentiment === 'object') {
    values.fear_greed = sentiment.fear_greed_current as number ?? values.fear_greed;
    values.fear_greed_trend = sentiment.fear_greed_trend as string ?? null;
  }

  const cycle = reality.cycle as Record<string, unknown> | undefined;
  if (cycle && typeof cycle === 'object') {
    values.cycle_phase = cycle.estimated_cycle_phase as string ?? null;
    values.cycle_progress = cycle.cycle_progress_percentage as number ?? null;
    values.days_since_halving = cycle.days_since_last_halving as number ?? null;
  }

  const macro = reality.macro as Record<string, unknown> | undefined;
  if (macro && typeof macro === 'object') {
    values.fed_funds_trend = macro.fed_funds_trend as string ?? null;
    values.dxy_trend = macro.dxy_trend as string ?? null;
    values.yield_curve_state = macro.yield_curve_state as string ?? null;
    values.macro_crypto_impact = macro.macro_crypto_impact as string ?? null;
    values.recession_probability = macro.recession_probability as string ?? null;
  }

  const defi = reality.defi as Record<string, unknown> | undefined;
  if (defi && typeof defi === 'object') {
    values.tvl_change_7d = defi.tvl_change_7d as number ?? null;
    values.defi_health_score = defi.defi_health_score as number ?? null;
    values.tvl_trend = defi.tvl_trend as string ?? null;
  }

  const onchain = reality.onchain as Record<string, unknown> | undefined;
  if (onchain && typeof onchain === 'object') {
    values.mempool_congestion = onchain.mempool_congestion as string ?? null;
    values.onchain_activity = onchain.onchain_activity as string ?? null;
  }

  // Count accelerating narratives
  const narratives = reality.top_narratives as Array<unknown> | undefined;
  values.accelerating_narratives = Array.isArray(narratives) ? narratives.length : 0;

  return values;
}
