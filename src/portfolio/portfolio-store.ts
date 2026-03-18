import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface PortfolioHolding {
  asset: string;
  amount: number;
  entry_price_usd?: number;
}

export interface StoredPortfolio {
  agent_id: string;
  holdings: PortfolioHolding[];
  updated_at: string;
}

const DATA_DIR = process.env.FATHOM_DATA_DIR ?? './data';
const PORTFOLIO_DIR = join(DATA_DIR, 'portfolios');

function ensureDir(): void {
  if (!existsSync(PORTFOLIO_DIR)) {
    mkdirSync(PORTFOLIO_DIR, { recursive: true });
  }
}

function filePath(agentId: string): string {
  // Sanitize agent ID for filesystem safety
  const safe = agentId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  return join(PORTFOLIO_DIR, `${safe}.json`);
}

export function setPortfolio(agentId: string, holdings: PortfolioHolding[]): StoredPortfolio {
  ensureDir();
  const portfolio: StoredPortfolio = {
    agent_id: agentId,
    holdings,
    updated_at: new Date().toISOString(),
  };
  writeFileSync(filePath(agentId), JSON.stringify(portfolio, null, 2), 'utf-8');
  return portfolio;
}

export function getPortfolio(agentId: string): StoredPortfolio | null {
  const fp = filePath(agentId);
  if (!existsSync(fp)) return null;
  try {
    return JSON.parse(readFileSync(fp, 'utf-8')) as StoredPortfolio;
  } catch {
    return null;
  }
}
