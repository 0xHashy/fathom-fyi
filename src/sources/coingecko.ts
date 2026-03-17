import type {
  CoinGeckoGlobal,
  CoinGeckoMarketCoin,
  CoinGeckoCategory,
  CoinGeckoTrending,
} from '../types/index.js';

const BASE_URL = 'https://api.coingecko.com/api/v3';

function getHeaders(): Record<string, string> {
  const key = process.env.CG_API_KEY;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (key) headers['x-cg-demo-api-key'] = key;
  return headers;
}

// Exponential backoff: 1s → 2s → 4s → 8s
async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, { headers: getHeaders() });
      if (res.status === 429 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      if (!res.ok) {
        throw new Error(`CoinGecko API error: ${res.status} ${res.statusText}`);
      }
      return res;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError ?? new Error('CoinGecko API request failed');
}

export async function getGlobalData(): Promise<CoinGeckoGlobal> {
  const res = await fetchWithRetry(`${BASE_URL}/global`);
  return res.json() as Promise<CoinGeckoGlobal>;
}

export async function getMarkets(
  vsCurrency = 'usd',
  perPage = 50,
  sparkline = false,
  priceChange = '7d',
): Promise<CoinGeckoMarketCoin[]> {
  const url = `${BASE_URL}/coins/markets?vs_currency=${vsCurrency}&order=market_cap_desc&per_page=${perPage}&page=1&sparkline=${sparkline}&price_change_percentage=${priceChange}`;
  const res = await fetchWithRetry(url);
  return res.json() as Promise<CoinGeckoMarketCoin[]>;
}

export async function getCoinMarket(coinId: string): Promise<CoinGeckoMarketCoin> {
  const url = `${BASE_URL}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(coinId)}&price_change_percentage=7d`;
  const res = await fetchWithRetry(url);
  const data = (await res.json()) as CoinGeckoMarketCoin[];
  if (!data.length) throw new Error(`Coin not found: ${coinId}`);
  return data[0];
}

export async function getOHLC(coinId: string, days = 90): Promise<number[][]> {
  const url = `${BASE_URL}/coins/${encodeURIComponent(coinId)}/ohlc?vs_currency=usd&days=${days}`;
  const res = await fetchWithRetry(url);
  return res.json() as Promise<number[][]>;
}

export async function getMarketChart(coinId: string, days = 30): Promise<{ prices: number[][]; total_volumes: number[][] }> {
  const url = `${BASE_URL}/coins/${encodeURIComponent(coinId)}/market_chart?vs_currency=usd&days=${days}`;
  const res = await fetchWithRetry(url);
  return res.json() as Promise<{ prices: number[][]; total_volumes: number[][] }>;
}

export async function getCategories(): Promise<CoinGeckoCategory[]> {
  const res = await fetchWithRetry(`${BASE_URL}/coins/categories`);
  return res.json() as Promise<CoinGeckoCategory[]>;
}

export async function getTrending(): Promise<CoinGeckoTrending> {
  const res = await fetchWithRetry(`${BASE_URL}/search/trending`);
  return res.json() as Promise<CoinGeckoTrending>;
}

// Resolve common names/symbols to CoinGecko IDs
const COMMON_IDS: Record<string, string> = {
  btc: 'bitcoin', bitcoin: 'bitcoin',
  eth: 'ethereum', ethereum: 'ethereum',
  sol: 'solana', solana: 'solana',
  bnb: 'binancecoin', binancecoin: 'binancecoin',
  xrp: 'ripple', ripple: 'ripple',
  ada: 'cardano', cardano: 'cardano',
  doge: 'dogecoin', dogecoin: 'dogecoin',
  dot: 'polkadot', polkadot: 'polkadot',
  avax: 'avalanche-2', 'avalanche': 'avalanche-2',
  matic: 'matic-network', polygon: 'matic-network',
  link: 'chainlink', chainlink: 'chainlink',
  uni: 'uniswap', uniswap: 'uniswap',
  atom: 'cosmos', cosmos: 'cosmos',
  ltc: 'litecoin', litecoin: 'litecoin',
  near: 'near', arb: 'arbitrum', arbitrum: 'arbitrum',
  op: 'optimism', optimism: 'optimism',
  apt: 'aptos', aptos: 'aptos',
  sui: 'sui', sei: 'sei-network',
  pepe: 'pepe', shib: 'shiba-inu',
};

export function resolveCoingeckoId(input: string): string {
  const normalized = input.toLowerCase().trim();
  return COMMON_IDS[normalized] ?? normalized;
}
