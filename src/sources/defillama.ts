import type { DefiLlamaChain, DefiLlamaProtocol } from '../types/index.js';

const BASE_URL = 'https://api.llama.fi';

async function fetchDeFiLlama(path: string): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`DeFiLlama API error: ${res.status} ${res.statusText}`);
  }
  return res;
}

export async function getHistoricalTvl(): Promise<Array<{ date: number; tvl: number }>> {
  const res = await fetchDeFiLlama('/v2/historicalChainTvl');
  return res.json() as Promise<Array<{ date: number; tvl: number }>>;
}

export async function getChains(): Promise<DefiLlamaChain[]> {
  const res = await fetchDeFiLlama('/v2/chains');
  return res.json() as Promise<DefiLlamaChain[]>;
}

export async function getProtocols(): Promise<DefiLlamaProtocol[]> {
  const res = await fetchDeFiLlama('/protocols');
  return res.json() as Promise<DefiLlamaProtocol[]>;
}

export async function getChainHistoricalTvl(chain: string): Promise<Array<{ date: number; tvl: number }>> {
  const res = await fetchDeFiLlama(`/v2/historicalChainTvl/${encodeURIComponent(chain)}`);
  return res.json() as Promise<Array<{ date: number; tvl: number }>>;
}

export async function getFees(): Promise<{
  protocols: Array<{ name: string; total24h: number | null; total7d: number | null; total30d: number | null }>;
}> {
  const res = await fetch('https://api.llama.fi/summary/fees', {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`DeFiLlama fees API error: ${res.status}`);
  return res.json() as Promise<{
    protocols: Array<{ name: string; total24h: number | null; total7d: number | null; total30d: number | null }>;
  }>;
}
