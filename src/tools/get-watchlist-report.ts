import type { AssetContextOutput, ErrorOutput } from '../types/index.js';
import type { CacheService } from '../cache/cache-service.js';
import { getAssetContext } from './get-asset-context.js';
import { saveWatchlistSnapshot, getWatchlistSnapshot, type WatchlistSnapshot } from '../storage/watchlist-store.js';
import { createHash } from 'crypto';

const AGENT_ID = process.env.FATHOM_AGENT_ID ??
  createHash('sha256').update(process.env.CG_API_KEY ?? 'anonymous').digest('hex').slice(0, 12);

export interface WatchlistAsset {
  asset: string;
  price_usd: number;
  cycle_position: string;
  risk_level: string;
  volume_health: string;
  price_trend: string;
  holder_behavior: string;
  changed_since_last_check: boolean;
  change_detail: string;
}

export interface WatchlistReportOutput {
  assets: WatchlistAsset[];
  state_changes: WatchlistAsset[];
  elevated_volume_assets: string[];
  highest_risk_asset: string;
  lowest_risk_asset: string;
  total_assets: number;
  agent_guidance: string;
}

const RISK_ORDER: Record<string, number> = { low: 0, moderate: 1, high: 2, extreme: 3 };

export async function getWatchlistReport(cache: CacheService, assets: string[]): Promise<WatchlistReportOutput | ErrorOutput> {
  if (assets.length === 0) {
    return {
      error: true, error_source: 'get_watchlist_report',
      agent_guidance: 'No assets provided. Pass an array of asset names, e.g. ["btc", "eth", "sol"].',
      last_known_data: null, data_warnings: ['Empty asset list.'],
    };
  }

  const limited = assets.slice(0, 10);

  try {
    const results = await Promise.allSettled(
      limited.map(a => getAssetContext(cache, a))
    );

    const previous = getWatchlistSnapshot(AGENT_ID);
    const prevMap = new Map<string, WatchlistSnapshot>();
    if (previous) {
      for (const s of previous.snapshots) prevMap.set(s.asset.toLowerCase(), s);
    }

    const watchlistAssets: WatchlistAsset[] = [];
    const elevatedVolume: string[] = [];

    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      const data = r.value;
      if ('error' in data) continue;

      const asset = data as AssetContextOutput;
      const prev = prevMap.get(asset.asset.toLowerCase());

      let changed = false;
      let changeDetail = 'No change since last check.';
      if (prev) {
        const changes: string[] = [];
        if (prev.cycle_position !== asset.cycle_position) changes.push(`cycle: ${prev.cycle_position} → ${asset.cycle_position}`);
        if (prev.risk_level !== asset.risk_level) changes.push(`risk: ${prev.risk_level} → ${asset.risk_level}`);
        if (prev.price_trend !== asset.price_trend) changes.push(`trend: ${prev.price_trend} → ${asset.price_trend}`);
        if (changes.length > 0) {
          changed = true;
          changeDetail = changes.join(', ');
        }
      } else {
        changeDetail = 'First check — no prior data.';
      }

      if (asset.volume_health === 'elevated' || asset.volume_health === 'extreme') {
        elevatedVolume.push(asset.asset);
      }

      watchlistAssets.push({
        asset: asset.asset,
        price_usd: asset.price_usd,
        cycle_position: asset.cycle_position,
        risk_level: asset.risk_level,
        volume_health: asset.volume_health,
        price_trend: asset.price_trend,
        holder_behavior: asset.holder_behavior,
        changed_since_last_check: changed,
        change_detail: changeDetail,
      });
    }

    // Save current snapshot for next comparison
    const snapshots: WatchlistSnapshot[] = watchlistAssets.map(a => ({
      asset: a.asset,
      cycle_position: a.cycle_position,
      risk_level: a.risk_level,
      price_trend: a.price_trend,
      volume_health: a.volume_health,
      timestamp: new Date().toISOString(),
    }));
    saveWatchlistSnapshot(AGENT_ID, snapshots);

    const stateChanges = watchlistAssets.filter(a => a.changed_since_last_check);
    const sorted = [...watchlistAssets].sort((a, b) => (RISK_ORDER[b.risk_level] ?? 0) - (RISK_ORDER[a.risk_level] ?? 0));
    const highestRisk = sorted[0]?.asset ?? 'none';
    const lowestRisk = sorted[sorted.length - 1]?.asset ?? 'none';

    let guidance = `Watchlist: ${watchlistAssets.length} assets analyzed. `;
    if (stateChanges.length > 0) {
      guidance += `STATE CHANGES DETECTED: ${stateChanges.map(s => `${s.asset} (${s.change_detail})`).join('; ')}. Review these positions. `;
    } else {
      guidance += 'No state changes since last check. ';
    }
    if (elevatedVolume.length > 0) {
      guidance += `Elevated volume on: ${elevatedVolume.join(', ')}. `;
    }
    guidance += `Highest risk: ${highestRisk}. Lowest risk: ${lowestRisk}.`;

    return {
      assets: watchlistAssets,
      state_changes: stateChanges,
      elevated_volume_assets: elevatedVolume,
      highest_risk_asset: highestRisk,
      lowest_risk_asset: lowestRisk,
      total_assets: watchlistAssets.length,
      agent_guidance: guidance,
    };
  } catch {
    return {
      error: true, error_source: 'get_watchlist_report',
      agent_guidance: 'Watchlist report temporarily unavailable. Retry shortly.',
      last_known_data: null, data_warnings: ['Watchlist service temporarily unavailable.'],
    };
  }
}
