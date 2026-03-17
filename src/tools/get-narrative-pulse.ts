import type { NarrativePulseOutput, NarrativeEntry, EmergingNarrative, CyclePhase, ErrorOutput } from '../types/index.js';
import { CacheService } from '../cache/cache-service.js';
import { getCacheTtl } from '../auth/tier-check.js';
import { getCategories, getTrending } from '../sources/coingecko.js';

const CACHE_KEY = 'narrative_pulse';
const BASE_TTL = 900;

export async function getNarrativePulse(cache: CacheService): Promise<NarrativePulseOutput | ErrorOutput> {
  const cached = cache.get<NarrativePulseOutput>(CACHE_KEY);
  if (cached) return cached.data;

  try {
    const [categories, trending] = await Promise.all([
      getCategories(),
      getTrending(),
    ]);

    // Filter out invalid categories
    const validCategories = categories.filter(c =>
      c.market_cap > 0 && c.name && c.id &&
      typeof c.market_cap_change_24h === 'number' &&
      !isNaN(c.market_cap_change_24h)
    );

    // Calculate momentum scores
    const withMomentum = validCategories.slice(0, 50).map(cat => {
      // We only have 24h change from categories endpoint
      const change24h = cat.market_cap_change_24h;
      // Approximate 7d from momentum pattern — normalize to momentum score
      const momentumScore = Math.abs(change24h) > 1 ? Math.abs(change24h) / 5 : 0.5;

      return {
        narrative: cat.name,
        category_id: cat.id,
        market_cap_usd: cat.market_cap,
        change_24h: Math.round(change24h * 100) / 100,
        change_7d: 0, // Not directly available from this endpoint
        momentum_score: Math.round(momentumScore * 100) / 100,
        signal: '',
      };
    });

    // Classify accelerating, decelerating, emerging
    const accelerating: NarrativeEntry[] = withMomentum
      .filter(n => n.change_24h > 5)
      .sort((a, b) => b.change_24h - a.change_24h)
      .slice(0, 5)
      .map(n => ({
        ...n,
        signal: `${n.narrative} surging +${n.change_24h}% in 24h — momentum accelerating`,
      }));

    const decelerating: NarrativeEntry[] = withMomentum
      .filter(n => n.change_24h < -5)
      .sort((a, b) => a.change_24h - b.change_24h)
      .slice(0, 5)
      .map(n => ({
        ...n,
        signal: `${n.narrative} declining ${n.change_24h}% in 24h — momentum fading`,
      }));

    // Emerging: trending coins that might represent new narratives
    const emerging: EmergingNarrative[] = trending.coins.slice(0, 5).map(t => ({
      narrative: `${t.item.name} (${t.item.symbol.toUpperCase()})`,
      signal: `Trending on CoinGecko — rank #${t.item.market_cap_rank ?? 'unranked'}`,
      why_notable: t.item.market_cap_rank && t.item.market_cap_rank < 100
        ? 'Top-100 asset gaining fresh attention — potential narrative leader'
        : 'Lower-cap asset trending — early signal of emerging narrative or speculative interest',
    }));

    // Determine dominant theme
    const dominantTheme = accelerating.length > 0
      ? `${accelerating[0].narrative} leading with +${accelerating[0].change_24h}% move`
      : decelerating.length > 0
        ? `Broad weakness — ${decelerating[0].narrative} leading declines at ${decelerating[0].change_24h}%`
        : 'No dominant narrative — market is in rotation/consolidation';

    // Cycle phase from narrative breadth
    const cyclePhase = determineCyclePhaseFromNarratives(accelerating.length, decelerating.length, validCategories.length);

    const guidance = generateNarrativeGuidance(accelerating, decelerating, cyclePhase, dominantTheme);

    const result: NarrativePulseOutput = {
      accelerating,
      decelerating,
      emerging,
      dominant_theme: dominantTheme,
      cycle_phase: cyclePhase,
      agent_guidance: guidance,
    };

    cache.set(CACHE_KEY, result, getCacheTtl(BASE_TTL));
    return result;
  } catch (err) {
    return {
      error: true,
      error_source: 'get_narrative_pulse',
      agent_guidance: 'Narrative data unavailable. Without sector rotation context, avoid concentrated bets on specific narratives. Stick to large-cap positions until data is restored.',
      last_known_data: cache.get<NarrativePulseOutput>(CACHE_KEY)?.data ?? null,
      data_warnings: ['Narrative data source temporarily unavailable. Retry shortly.'],
    };
  }
}

function determineCyclePhaseFromNarratives(
  accCount: number,
  decCount: number,
  totalCategories: number,
): CyclePhase {
  const accRatio = accCount / Math.max(totalCategories, 1);
  const decRatio = decCount / Math.max(totalCategories, 1);

  if (accRatio > 0.1 && decRatio < 0.02) return 'early';
  if (accRatio > 0.05) return 'mid';
  if (accRatio > 0 && decRatio > 0.05) return 'late';
  return 'exhausted';
}

function generateNarrativeGuidance(
  accelerating: NarrativeEntry[],
  decelerating: NarrativeEntry[],
  cyclePhase: CyclePhase,
  dominantTheme: string,
): string {
  const phaseGuidance: Record<CyclePhase, string> = {
    'early': 'Narrative cycle in early phase — few sectors leading, broad market hasn\'t caught up. Focus on the leading narratives but size positions for a potentially long runway.',
    'mid': 'Narrative cycle in mid phase — multiple sectors participating. This is typically the most profitable phase for narrative-based positioning. Ride the momentum but watch for crowding.',
    'late': 'Narrative cycle in late phase — leaders starting to fade while new narratives emerge. Rotate away from exhausted narratives into fresh momentum. Reduce concentration.',
    'exhausted': 'Narrative cycle exhausted — few sectors showing strength, broad weakness. This is not the time for narrative bets. Focus on quality assets and wait for new cycle of narrative emergence.',
  };

  const topNarratives = accelerating.slice(0, 3).map(n => n.narrative).join(', ');
  const bottomNarratives = decelerating.slice(0, 3).map(n => n.narrative).join(', ');

  let guidance = `Dominant theme: ${dominantTheme}. ${phaseGuidance[cyclePhase]}`;

  if (topNarratives) guidance += ` Accelerating sectors: ${topNarratives}.`;
  if (bottomNarratives) guidance += ` Fading sectors: ${bottomNarratives} — avoid or reduce exposure.`;

  return guidance;
}
