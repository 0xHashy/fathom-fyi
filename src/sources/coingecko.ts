import type {
  CoinGeckoGlobal,
  CoinGeckoMarketCoin,
  CoinGeckoCategory,
  CoinGeckoTrending,
} from '../types/index.js';
import { isProxyEnabled, proxyFetch } from './proxy.js';

function getBaseUrl(): string {
  const key = process.env.CG_API_KEY ?? '';
  // Pro keys don't start with CG- and use a different endpoint
  if (key && !key.startsWith('CG-')) return 'https://pro-api.coingecko.com/api/v3';
  return 'https://api.coingecko.com/api/v3';
}

function getHeaders(): Record<string, string> {
  const key = process.env.CG_API_KEY;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (key) {
    if (key.startsWith('CG-')) {
      headers['x-cg-demo-api-key'] = key;
    } else {
      headers['x-cg-pro-api-key'] = key;
    }
  }
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
        throw new Error(`Market data source temporarily unavailable (${res.status})`);
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
  if (isProxyEnabled()) return proxyFetch<CoinGeckoGlobal>('cg/global');
  const res = await fetchWithRetry(`${getBaseUrl()}/global`);
  return res.json() as Promise<CoinGeckoGlobal>;
}

export async function getMarkets(
  vsCurrency = 'usd',
  perPage = 50,
  sparkline = false,
  priceChange = '7d',
): Promise<CoinGeckoMarketCoin[]> {
  if (isProxyEnabled()) return proxyFetch<CoinGeckoMarketCoin[]>('cg/markets', { per_page: perPage });
  const url = `${getBaseUrl()}/coins/markets?vs_currency=${vsCurrency}&order=market_cap_desc&per_page=${perPage}&page=1&sparkline=${sparkline}&price_change_percentage=${priceChange}`;
  const res = await fetchWithRetry(url);
  return res.json() as Promise<CoinGeckoMarketCoin[]>;
}

export async function getCoinMarket(coinId: string): Promise<CoinGeckoMarketCoin> {
  if (isProxyEnabled()) {
    const data = await proxyFetch<CoinGeckoMarketCoin[]>('cg/coin', { id: coinId });
    if (!data.length) throw new Error('Coin not found or not indexed');
    return data[0];
  }
  const url = `${getBaseUrl()}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(coinId)}&price_change_percentage=7d`;
  const res = await fetchWithRetry(url);
  const data = (await res.json()) as CoinGeckoMarketCoin[];
  if (!data.length) throw new Error('Coin not found or not indexed');
  return data[0];
}

// ─── Shared in-flight request deduplication ───
// If two tools request the same chart data simultaneously, only one API call fires.
const inFlight = new Map<string, Promise<unknown>>();
const chartCache = new Map<string, { data: unknown; ts: number }>();
const CHART_CACHE_TTL = 120_000; // 2 minutes

function getCachedOrFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  // Check memory cache first
  const cached = chartCache.get(key);
  if (cached && Date.now() - cached.ts < CHART_CACHE_TTL) {
    return Promise.resolve(cached.data as T);
  }

  // Check if same request is already in flight
  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T>;

  // Fire the request and cache it
  const promise = fetcher().then(data => {
    chartCache.set(key, { data, ts: Date.now() });
    inFlight.delete(key);
    // Evict old entries
    if (chartCache.size > 50) {
      const oldest = Array.from(chartCache.entries()).sort((a, b) => a[1].ts - b[1].ts)[0];
      if (oldest) chartCache.delete(oldest[0]);
    }
    return data;
  }).catch(err => {
    inFlight.delete(key);
    throw err;
  });

  inFlight.set(key, promise);
  return promise;
}

export async function getOHLC(coinId: string, days = 90): Promise<number[][]> {
  const key = `ohlc:${coinId}:${days}`;
  return getCachedOrFetch(key, async () => {
    if (isProxyEnabled()) return proxyFetch<number[][]>('cg/ohlc', { id: coinId, days });
    const url = `${getBaseUrl()}/coins/${encodeURIComponent(coinId)}/ohlc?vs_currency=usd&days=${days}`;
    const res = await fetchWithRetry(url);
    return res.json() as Promise<number[][]>;
  });
}

export async function getMarketChart(coinId: string, days = 30): Promise<{ prices: number[][]; total_volumes: number[][] }> {
  const key = `chart:${coinId}:${days}`;
  return getCachedOrFetch(key, async () => {
    if (isProxyEnabled()) return proxyFetch<{ prices: number[][]; total_volumes: number[][] }>('cg/chart', { id: coinId, days });
    const url = `${getBaseUrl()}/coins/${encodeURIComponent(coinId)}/market_chart?vs_currency=usd&days=${days}`;
    const res = await fetchWithRetry(url);
    return res.json() as Promise<{ prices: number[][]; total_volumes: number[][] }>;
  });
}

export async function getCategories(): Promise<CoinGeckoCategory[]> {
  if (isProxyEnabled()) return proxyFetch<CoinGeckoCategory[]>('cg/categories');
  const res = await fetchWithRetry(`${getBaseUrl()}/coins/categories`);
  return res.json() as Promise<CoinGeckoCategory[]>;
}

export async function getTrending(): Promise<CoinGeckoTrending> {
  if (isProxyEnabled()) return proxyFetch<CoinGeckoTrending>('cg/trending');
  const res = await fetchWithRetry(`${getBaseUrl()}/search/trending`);
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
  // Sanitize: only allow alphanumeric, hyphens, and dots (valid CoinGecko ID chars)
  const sanitized = COMMON_IDS[normalized] ?? normalized;
  if (sanitized.length > 100 || !/^[a-z0-9][a-z0-9.\-]*$/.test(sanitized)) {
    throw new Error('Invalid asset identifier');
  }
  return sanitized;
}
