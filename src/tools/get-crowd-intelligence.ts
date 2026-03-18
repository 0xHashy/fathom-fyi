import { getCrowdIntelligence, type CrowdIntelligence } from '../crowd/crowd-aggregator.js';
import type { ErrorOutput } from '../types/index.js';

const API_KEY = process.env.FATHOM_API_KEY ?? '';
const CROWD_ENDPOINT = 'https://fathom.fyi/api/crowd';

export async function getCrowdIntel(): Promise<CrowdIntelligence | ErrorOutput> {
  // Try central API first (real crowd data from all agents)
  if (API_KEY) {
    try {
      const res = await fetch(
        `${CROWD_ENDPOINT}?key=${encodeURIComponent(API_KEY)}`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (res.ok) {
        const data = await res.json() as CrowdIntelligence;
        if (data && data.total_agents_24h !== undefined) {
          return data;
        }
      }
    } catch {
      // Fall through to local
    }
  }

  // Fallback to local aggregation
  try {
    return getCrowdIntelligence();
  } catch {
    return {
      error: true,
      error_source: 'get_crowd_intelligence',
      agent_guidance: 'Crowd intelligence temporarily unavailable. This feature improves as more agents connect to Fathom.',
      last_known_data: null,
      data_warnings: ['Crowd intelligence service temporarily unavailable.'],
    };
  }
}
