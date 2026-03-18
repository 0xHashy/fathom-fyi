import type { PortfolioHolding } from '../portfolio/portfolio-store.js';
import { setPortfolio } from '../portfolio/portfolio-store.js';
import { createHash } from 'crypto';

const AGENT_ID = process.env.FATHOM_AGENT_ID ??
  createHash('sha256').update(process.env.CG_API_KEY ?? 'anonymous').digest('hex').slice(0, 12);

export interface SetPortfolioResult {
  success: boolean;
  agent_id: string;
  holdings_count: number;
  updated_at: string;
  agent_guidance: string;
}

export function setPortfolioContext(holdings: PortfolioHolding[]): SetPortfolioResult {
  const portfolio = setPortfolio(AGENT_ID, holdings);

  return {
    success: true,
    agent_id: AGENT_ID,
    holdings_count: holdings.length,
    updated_at: portfolio.updated_at,
    agent_guidance: `Portfolio context saved with ${holdings.length} position${holdings.length === 1 ? '' : 's'}. Call get_portfolio_analysis to receive personalized guidance based on current market conditions. Call get_reality_check to see how your portfolio aligns with the current regime.`,
  };
}
