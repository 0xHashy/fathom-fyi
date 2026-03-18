import { getAllSignals } from '../storage/signal-store.js';

export interface CrowdIntelligence {
  total_agents_24h: number;
  total_signals_24h: number;
  posture_distribution: Record<string, number>;
  consensus_posture: string;
  consensus_strength: 'strong' | 'moderate' | 'weak' | 'no_consensus';
  regime_distribution: Record<string, number>;
  consensus_regime: string;
  most_queried_assets: string[];
  avg_risk_score: number;
  avg_opportunity_score: number;
  crowd_fear_level: 'calm' | 'cautious' | 'fearful' | 'panicking';
  data_sufficient: boolean;
  agent_guidance: string;
}

export function getCrowdIntelligence(): CrowdIntelligence {
  const cutoff = Date.now() - 24 * 3600_000;
  const allSignals = getAllSignals();
  const recent = allSignals.filter(s => new Date(s.timestamp).getTime() > cutoff);

  const agents = new Set(recent.map(s => s.agent_id));
  const totalAgents = agents.size;
  const dataSufficient = totalAgents >= 3;

  // Posture distribution
  const postureCounts: Record<string, number> = {};
  const regimeCounts: Record<string, number> = {};
  const assetCounts: Record<string, number> = {};
  let riskSum = 0;
  let riskCount = 0;
  let oppSum = 0;
  let oppCount = 0;

  for (const s of recent) {
    if (s.posture) {
      postureCounts[s.posture] = (postureCounts[s.posture] ?? 0) + 1;
    }
    if (s.regime) {
      regimeCounts[s.regime] = (regimeCounts[s.regime] ?? 0) + 1;
    }
    if (s.input_params?.asset) {
      const asset = String(s.input_params.asset);
      assetCounts[asset] = (assetCounts[asset] ?? 0) + 1;
    }
    if (s.risk_score !== undefined) {
      riskSum += s.risk_score;
      riskCount++;
    }
    if (s.opportunity_score !== undefined) {
      oppSum += s.opportunity_score;
      oppCount++;
    }
  }

  // Convert to percentages
  const totalPosture = Object.values(postureCounts).reduce((a, b) => a + b, 0);
  const postureDistribution: Record<string, number> = {};
  for (const [k, v] of Object.entries(postureCounts)) {
    postureDistribution[k] = totalPosture > 0 ? Math.round((v / totalPosture) * 100) : 0;
  }

  const totalRegime = Object.values(regimeCounts).reduce((a, b) => a + b, 0);
  const regimeDistribution: Record<string, number> = {};
  for (const [k, v] of Object.entries(regimeCounts)) {
    regimeDistribution[k] = totalRegime > 0 ? Math.round((v / totalRegime) * 100) : 0;
  }

  // Consensus
  const topPosture = Object.entries(postureCounts).sort((a, b) => b[1] - a[1]);
  const consensusPosture = topPosture[0]?.[0] ?? 'unknown';
  const topPosturePct = totalPosture > 0 ? (topPosture[0]?.[1] ?? 0) / totalPosture : 0;

  let consensusStrength: CrowdIntelligence['consensus_strength'] = 'no_consensus';
  if (topPosturePct > 0.75) consensusStrength = 'strong';
  else if (topPosturePct > 0.55) consensusStrength = 'moderate';
  else if (topPosturePct > 0.4) consensusStrength = 'weak';

  const topRegime = Object.entries(regimeCounts).sort((a, b) => b[1] - a[1]);
  const consensusRegime = topRegime[0]?.[0] ?? 'unknown';

  const topAssets = Object.entries(assetCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([asset]) => asset);

  const avgRisk = riskCount > 0 ? Math.round(riskSum / riskCount) : 50;
  const avgOpp = oppCount > 0 ? Math.round(oppSum / oppCount) : 50;

  let crowdFear: CrowdIntelligence['crowd_fear_level'] = 'calm';
  if (avgRisk > 70) crowdFear = 'panicking';
  else if (avgRisk > 55) crowdFear = 'fearful';
  else if (avgRisk > 40) crowdFear = 'cautious';

  const guidance = generateCrowdGuidance(
    dataSufficient, totalAgents, consensusPosture, consensusStrength, crowdFear, avgRisk,
  );

  return {
    total_agents_24h: totalAgents,
    total_signals_24h: recent.length,
    posture_distribution: postureDistribution,
    consensus_posture: consensusPosture,
    consensus_strength: consensusStrength,
    regime_distribution: regimeDistribution,
    consensus_regime: consensusRegime,
    most_queried_assets: topAssets,
    avg_risk_score: avgRisk,
    avg_opportunity_score: avgOpp,
    crowd_fear_level: crowdFear,
    data_sufficient: dataSufficient,
    agent_guidance: guidance,
  };
}

function generateCrowdGuidance(
  sufficient: boolean,
  agents: number,
  posture: string,
  strength: string,
  fear: string,
  avgRisk: number,
): string {
  if (!sufficient) {
    return `Crowd intelligence data is limited (${agents} agent${agents === 1 ? '' : 's'} in last 24h). Consensus signals are unreliable below 3 agents. As Fathom adoption grows, this data becomes a proprietary signal unavailable anywhere else.`;
  }

  let guidance = `${agents} Fathom-connected agents active in last 24h. `;

  if (strength === 'strong') {
    guidance += `Strong consensus: ${posture} posture (>75% agreement). When the majority of agents converge on the same posture, the signal is meaningful. `;
  } else if (strength === 'moderate') {
    guidance += `Moderate consensus toward ${posture} posture. Majority but not overwhelming agreement. `;
  } else {
    guidance += `No clear consensus — agents are split on posture. Mixed signals across the network. `;
  }

  if (fear === 'panicking') {
    guidance += `Crowd fear level: panicking (avg risk ${avgRisk}). Historically, peak crowd fear precedes bottoms. Contrarian opportunity may be forming.`;
  } else if (fear === 'calm') {
    guidance += `Crowd is calm (avg risk ${avgRisk}). Low fear can indicate complacency — monitor for sudden shifts.`;
  }

  return guidance;
}
