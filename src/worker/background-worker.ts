import type { CacheService } from '../cache/cache-service.js';
import { getMarketRegime } from '../tools/get-market-regime.js';
import { getSentimentState } from '../tools/get-sentiment-state.js';
import { getDefiHealth } from '../tools/get-defi-health.js';
import { getMacroContext } from '../tools/get-macro-context.js';
import { getOnchainPulse } from '../tools/get-onchain-pulse.js';
import { getTemporalContext } from '../tools/get-temporal-context.js';
import { getNarrativePulse } from '../tools/get-narrative-pulse.js';
import { getRealityCheck } from '../tools/get-reality-check.js';
import { evaluateAndFireWebhooks } from './webhook-manager.js';

let intervalHandle: ReturnType<typeof setInterval> | null = null;

const DEFAULT_INTERVAL = 60_000; // 60 seconds

export function startBackgroundWorker(cache: CacheService): void {
  const interval = parseInt(process.env.FATHOM_WORKER_INTERVAL_MS ?? String(DEFAULT_INTERVAL), 10);
  const enabled = process.env.FATHOM_WORKER_ENABLED !== 'false';

  if (!enabled) return;

  // Warm cache immediately on startup
  warmCache(cache);

  // Then refresh on interval
  intervalHandle = setInterval(() => warmCache(cache), interval);

  // Don't let the worker keep the process alive if everything else stops
  if (intervalHandle && typeof intervalHandle === 'object' && 'unref' in intervalHandle) {
    intervalHandle.unref();
  }
}

export function stopBackgroundWorker(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

async function warmCache(cache: CacheService): Promise<void> {
  try {
    // Pre-compute all independent tools in parallel
    await Promise.allSettled([
      getMarketRegime(cache),
      getSentimentState(cache),
      getDefiHealth(cache),
      getMacroContext(cache),
      getOnchainPulse(cache),
      getTemporalContext(cache),
      getNarrativePulse(cache),
    ]);

    // Then pre-compute the master tool (benefits from cached sub-tools)
    const realityCheck = await getRealityCheck(cache);

    // Evaluate webhook conditions against latest data
    await evaluateAndFireWebhooks(realityCheck);
  } catch {
    // Background worker should never crash the server
  }
}
