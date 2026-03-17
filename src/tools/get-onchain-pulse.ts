import type { OnchainPulseOutput, Congestion, NetworkSecurity, MiningEconomics, OnchainActivity, MinerPool, ErrorOutput } from '../types/index.js';
import { CacheService } from '../cache/cache-service.js';
import { getCacheTtl } from '../auth/tier-check.js';
import { getRecommendedFees, getBlockTipHeight, getHashratePools, getDifficultyAdjustments } from '../sources/mempool.js';

const CACHE_KEY = 'onchain_pulse';
const BASE_TTL = 600;

export async function getOnchainPulse(cache: CacheService): Promise<OnchainPulseOutput | ErrorOutput> {
  const cached = cache.get<OnchainPulseOutput>(CACHE_KEY);
  if (cached) return cached.data;

  try {
    const [fees, blockHeight, pools, difficulty] = await Promise.allSettled([
      getRecommendedFees(),
      getBlockTipHeight(),
      getHashratePools(),
      getDifficultyAdjustments(),
    ]);

    // Fees & congestion
    let recommendedFee = 0;
    let congestion: Congestion = 'normal';
    if (fees.status === 'fulfilled') {
      recommendedFee = fees.value.halfHourFee;
      congestion = classifyCongestion(fees.value);
    }

    // Block height
    const height = blockHeight.status === 'fulfilled' ? blockHeight.value : 0;

    // Miner distribution
    let minerDistribution: MinerPool[] = [];
    let security: NetworkSecurity = 'normal';
    if (pools.status === 'fulfilled' && pools.value.pools) {
      minerDistribution = pools.value.pools
        .sort((a, b) => b.share - a.share)
        .slice(0, 10)
        .map(p => ({
          pool_name: p.name,
          share_percentage: Math.round(p.share * 10000) / 100,
        }));

      // Security assessment: if top pool > 30%, weak; if no pool > 20%, strong
      const topShare = minerDistribution.length > 0 ? minerDistribution[0].share_percentage : 0;
      security = topShare > 30 ? 'weak' : topShare < 20 ? 'strong' : 'normal';
    }

    // Mining economics
    let miningEconomics: MiningEconomics = 'profitable';
    if (difficulty.status === 'fulfilled' && difficulty.value.length > 0) {
      const latestDiff = difficulty.value[0];
      if (latestDiff.difficultyChange > 5) miningEconomics = 'profitable';
      else if (latestDiff.difficultyChange < -5) miningEconomics = 'stressed';
      else miningEconomics = 'marginal';
    }

    // On-chain activity
    const activity = classifyActivity(congestion, recommendedFee);

    const guidance = generateOnchainGuidance(congestion, security, miningEconomics, activity, recommendedFee);

    const result: OnchainPulseOutput = {
      block_height: height,
      mempool_congestion: congestion,
      recommended_fee_sats: recommendedFee,
      miner_distribution: minerDistribution,
      network_security: security,
      mining_economics: miningEconomics,
      onchain_activity: activity,
      agent_guidance: guidance,
    };

    cache.set(CACHE_KEY, result, getCacheTtl(BASE_TTL));
    return result;
  } catch (err) {
    return {
      error: true,
      error_source: 'get_onchain_pulse',
      agent_guidance: 'Bitcoin on-chain data unavailable. Without network health context, avoid making timing-sensitive BTC transactions. Network conditions are unknown.',
      last_known_data: cache.get<OnchainPulseOutput>(CACHE_KEY)?.data ?? null,
      data_warnings: [`Failed to fetch on-chain data: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}

function classifyCongestion(fees: { fastestFee: number; halfHourFee: number; economyFee: number }): Congestion {
  const fee = fees.halfHourFee;
  if (fee <= 2) return 'empty';
  if (fee <= 20) return 'normal';
  if (fee <= 80) return 'busy';
  return 'congested';
}

function classifyActivity(congestion: Congestion, fee: number): OnchainActivity {
  if (congestion === 'congested' || fee > 50) return 'high';
  if (congestion === 'empty' || fee <= 2) return 'low';
  return 'normal';
}

function generateOnchainGuidance(
  congestion: Congestion,
  security: NetworkSecurity,
  economics: MiningEconomics,
  activity: OnchainActivity,
  fee: number,
): string {
  let guidance = `Bitcoin network: block congestion is ${congestion} (recommended fee: ${fee} sat/vB). `;

  if (congestion === 'congested') {
    guidance += 'Network is heavily congested — delay non-urgent transactions or expect high fees. ';
  } else if (congestion === 'empty') {
    guidance += 'Network is very quiet — low activity may indicate reduced interest or efficient batching. ';
  }

  guidance += `Network security: ${security}. `;
  if (security === 'weak') {
    guidance += 'Mining centralization risk detected — top pool has >30% hashrate. This is a medium-term concern but not immediate. ';
  }

  guidance += `Mining economics: ${economics}. `;
  if (economics === 'stressed') {
    guidance += 'Miners are under stress — difficulty declining suggests hashrate leaving. Watch for miner capitulation (forced selling) which can create short-term price pressure. ';
  } else if (economics === 'profitable') {
    guidance += 'Healthy mining economics with rising difficulty confirms network growth and miner confidence. ';
  }

  guidance += `On-chain activity level: ${activity}.`;
  return guidance;
}
