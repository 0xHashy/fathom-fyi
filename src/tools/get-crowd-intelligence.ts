import { getCrowdIntelligence, type CrowdIntelligence } from '../crowd/crowd-aggregator.js';
import type { ErrorOutput } from '../types/index.js';

export function getCrowdIntel(): CrowdIntelligence | ErrorOutput {
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
