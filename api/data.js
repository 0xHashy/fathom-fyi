// Data proxy for paid tiers — routes all data source calls through Fathom's server
// with server-side API keys. Paid users never need CG_API_KEY or FRED_API_KEY.

import { kv } from '@vercel/kv';

const CG_KEY = process.env.CG_PRO_KEY || process.env.CG_API_KEY || '';
const FRED_KEY = process.env.FRED_API_KEY || '';

const SOURCES = {
  // CoinGecko
  'cg/global': () => cgFetch('/global'),
  'cg/markets': (q) => cgFetch(`/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${q.per_page || 50}&page=1&sparkline=false&price_change_percentage=7d`),
  'cg/coin': (q) => cgFetch(`/coins/markets?vs_currency=usd&ids=${encodeURIComponent(q.id || 'bitcoin')}&price_change_percentage=7d`),
  'cg/ohlc': (q) => cgFetch(`/coins/${encodeURIComponent(q.id || 'bitcoin')}/ohlc?vs_currency=usd&days=${q.days || 90}`),
  'cg/chart': (q) => cgFetch(`/coins/${encodeURIComponent(q.id || 'bitcoin')}/market_chart?vs_currency=usd&days=${q.days || 30}`),
  'cg/categories': () => cgFetch('/coins/categories'),
  'cg/trending': () => cgFetch('/search/trending'),

  // FRED
  'fred/series': (q) => fredFetch(q.series_id || 'DFF', q.limit || 5),

  // DeFiLlama
  'defi/tvl': () => extFetch('https://api.llama.fi/v2/historicalChainTvl'),
  'defi/chains': () => extFetch('https://api.llama.fi/v2/chains'),
  'defi/protocols': () => extFetch('https://api.llama.fi/protocols'),
  'defi/fees': () => extFetch('https://api.llama.fi/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true'),
  'defi/stablecoins': () => extFetch('https://stablecoins.llama.fi/stablecoins?includePrices=true'),

  // Deribit
  'deribit/ticker': (q) => extFetch(`https://www.deribit.com/api/v2/public/ticker?instrument_name=${encodeURIComponent(q.instrument || 'BTC-PERPETUAL')}`),
  'deribit/options': (q) => extFetch(`https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=${encodeURIComponent(q.currency || 'BTC')}&kind=option`),

  // Yahoo Finance
  'yahoo/chart': (q) => extFetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(q.symbol || '^GSPC')}?range=${q.range || '1mo'}&interval=${q.interval || '1d'}`, { 'User-Agent': 'Fathom/4.1.0' }),

  // Mempool
  'mempool/fees': () => extFetch('https://mempool.space/api/v1/fees/recommended'),
  'mempool/pools': () => extFetch('https://mempool.space/api/v1/mining/hashrate/pools/1m'),
  'mempool/difficulty': () => extFetch('https://mempool.space/api/v1/difficulty-adjustment'),
  'mempool/tip': () => extFetch('https://mempool.space/api/blocks/tip/height'),

  // Fear & Greed
  'feargreed': () => extFetch('https://api.alternative.me/fng/?limit=8'),

  // Weather
  'weather': (q) => extFetch(`https://api.open-meteo.com/v1/forecast?latitude=${q.lat}&longitude=${q.lon}&current=temperature_2m,weather_code,cloud_cover`),
};

// CoinGecko with Pro key
async function cgFetch(path) {
  const base = CG_KEY.startsWith('CG-')
    ? 'https://api.coingecko.com/api/v3'
    : 'https://pro-api.coingecko.com/api/v3';
  const headers = { Accept: 'application/json' };
  if (CG_KEY) {
    if (CG_KEY.startsWith('CG-')) {
      headers['x-cg-demo-api-key'] = CG_KEY;
    } else {
      headers['x-cg-pro-api-key'] = CG_KEY;
    }
  }
  const res = await fetch(`${base}${path}`, { headers, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  return res.json();
}

// FRED with server key
async function fredFetch(seriesId, limit) {
  if (!FRED_KEY) throw new Error('FRED not configured');
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(seriesId)}&api_key=${FRED_KEY}&file_type=json&sort_order=desc&limit=${limit}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`FRED ${res.status}`);
  return res.json();
}

// Generic external fetch
async function extFetch(url, extraHeaders = {}) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', ...extraHeaders },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`${new URL(url).hostname} ${res.status}`);
  return res.json();
}

// Simple in-memory cache (Vercel serverless functions persist across warm invocations)
const cache = new Map();
const CACHE_TTL = 60_000; // 1 minute

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
  // Evict old entries
  if (cache.size > 100) {
    const oldest = Array.from(cache.entries()).sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) cache.delete(oldest[0]);
  }
}

import { rateLimit, setSecurityHeaders, sanitizeQuery } from './_security.js';

export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!rateLimit(req, res)) return;
  req.query = sanitizeQuery(req.query);

  // Auth: require valid paid Fathom key
  const apiKey = req.query.key || req.headers['x-fathom-key'];
  if (!apiKey) return res.status(401).json({ error: 'API key required' });

  const keyRec = await kv.get(`key:${apiKey}`);
  if (!keyRec || !keyRec.active) return res.status(401).json({ error: 'Invalid API key' });
  if (keyRec.tier === 'free') return res.status(403).json({ error: 'Data proxy requires a paid tier. Free tier fetches data directly.' });

  // Route
  const source = req.query.source;
  const handler = SOURCES[source];
  if (!handler) return res.status(400).json({ error: 'Unknown source', available: Object.keys(SOURCES) });

  // Check cache
  const cacheKey = `${source}:${JSON.stringify(req.query)}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return res.status(200).json(cached);
  }

  try {
    const data = await handler(req.query);
    setCache(cacheKey, data);
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Data source temporarily unavailable', detail: err.message });
  }
}
