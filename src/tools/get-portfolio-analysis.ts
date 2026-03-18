import { getPortfolio } from '../portfolio/portfolio-store.js';
import { analyzePortfolio, type PortfolioAnalysis } from '../portfolio/portfolio-analyzer.js';
import { getRealityCheck } from './get-reality-check.js';
import type { CacheService } from '../cache/cache-service.js';
import type { ErrorOutput, RealityCheckOutput } from '../types/index.js';
import { createHash } from 'crypto';

const AGENT_ID = process.env.FATHOM_AGENT_ID ??
  createHash('sha256').update(process.env.CG_API_KEY ?? 'anonymous').digest('hex').slice(0, 12);

export interface PortfolioAnalysisOutput extends PortfolioAnalysis {
  market_context: {
    regime: string;
    posture: string;
    risk_score: number;
    opportunity_score: number;
  };
}

export async function getPortfolioAnalysis(cache: CacheService): Promise<PortfolioAnalysisOutput | ErrorOutput> {
  const portfolio = getPortfolio(AGENT_ID);

  if (!portfolio || portfolio.holdings.length === 0) {
    return {
      error: true,
      error_source: 'get_portfolio_analysis',
      agent_guidance: 'No portfolio context found. Call set_portfolio_context first with your holdings array: [{asset: "bitcoin", amount: 2}, {asset: "solana", amount: 50}].',
      last_known_data: null,
      data_warnings: ['No portfolio context set for this agent.'],
    };
  }

  try {
    // Get current market reality
    const reality = await getRealityCheck(cache);

    // Extract regime info (handle both success and error cases)
    let posture = 'moderate';
    let regime = 'transitional';
    let riskScore = 50;
    let opportunityScore = 50;

    if ('suggested_posture' in reality) {
      const r = reality as RealityCheckOutput;
      posture = r.suggested_posture;
      regime = typeof r.regime === 'object' && r.regime !== null ? (r.regime as unknown as Record<string, string>).regime ?? 'transitional' : 'transitional';
      riskScore = r.risk_score;
      opportunityScore = r.opportunity_score;
    }

    const analysis = await analyzePortfolio(
      portfolio.holdings,
      posture,
      regime,
      riskScore,
    );

    return {
      ...analysis,
      market_context: {
        regime,
        posture,
        risk_score: riskScore,
        opportunity_score: opportunityScore,
      },
    };
  } catch {
    return {
      error: true,
      error_source: 'get_portfolio_analysis',
      agent_guidance: 'Portfolio analysis temporarily unavailable. Market data sources may be down. Retry shortly.',
      last_known_data: null,
      data_warnings: ['Portfolio analysis service temporarily unavailable.'],
    };
  }
}
