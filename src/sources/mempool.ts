import type { MempoolFees, MempoolHashratePools, MempoolDifficultyAdjustment } from '../types/index.js';

const BASE_URL = 'https://mempool.space/api';

async function fetchMempool(path: string): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Mempool.space API error: ${res.status} ${res.statusText}`);
  }
  return res;
}

export async function getRecommendedFees(): Promise<MempoolFees> {
  const res = await fetchMempool('/v1/fees/recommended');
  return res.json() as Promise<MempoolFees>;
}

export async function getBlockTipHeight(): Promise<number> {
  const res = await fetchMempool('/blocks/tip/height');
  const text = await res.text();
  return parseInt(text, 10);
}

export async function getHashratePools(): Promise<MempoolHashratePools> {
  const res = await fetchMempool('/v1/mining/hashrate/pools/1w');
  return res.json() as Promise<MempoolHashratePools>;
}

export async function getDifficultyAdjustments(): Promise<MempoolDifficultyAdjustment[]> {
  const res = await fetchMempool('/v1/mining/difficulty-adjustments');
  return res.json() as Promise<MempoolDifficultyAdjustment[]>;
}
