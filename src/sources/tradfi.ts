const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

interface YahooChartResult {
  chart: {
    result: Array<{
      meta: { regularMarketPrice: number; previousClose: number; currency: string; symbol: string };
      timestamp: number[];
      indicators: {
        adjclose: Array<{ adjclose: number[] }>;
      };
    }>;
  };
}

interface AssetPriceHistory {
  symbol: string;
  current_price: number;
  previous_close: number;
  change_pct: number;
  daily_returns: number[]; // last 30 daily returns as percentages
}

async function fetchYahoo(symbol: string): Promise<AssetPriceHistory> {
  const url = `${YAHOO_BASE}/${encodeURIComponent(symbol)}?range=1mo&interval=1d`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'Fathom/1.0' },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Yahoo Finance ${symbol} returned ${res.status}`);

  const data = await res.json() as YahooChartResult;
  const result = data.chart.result?.[0];
  if (!result) throw new Error(`No data for ${symbol}`);

  const closes = result.indicators.adjclose?.[0]?.adjclose ?? [];
  const dailyReturns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) {
      dailyReturns.push(((closes[i] - closes[i - 1]) / closes[i - 1]) * 100);
    }
  }

  return {
    symbol: result.meta.symbol,
    current_price: result.meta.regularMarketPrice,
    previous_close: result.meta.previousClose,
    change_pct: result.meta.previousClose > 0
      ? ((result.meta.regularMarketPrice - result.meta.previousClose) / result.meta.previousClose) * 100
      : 0,
    daily_returns: dailyReturns,
  };
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 5) return 0;

  const xSlice = x.slice(-n);
  const ySlice = y.slice(-n);

  const meanX = xSlice.reduce((a, b) => a + b, 0) / n;
  const meanY = ySlice.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xSlice[i] - meanX;
    const dy = ySlice[i] - meanY;
    num += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denom = Math.sqrt(denomX * denomY);
  return denom > 0 ? num / denom : 0;
}

function classifyCorrelation(r: number): string {
  if (r > 0.7) return 'strong_positive';
  if (r > 0.3) return 'moderate_positive';
  if (r > -0.3) return 'uncorrelated';
  if (r > -0.7) return 'moderate_negative';
  return 'strong_negative';
}

export interface CorrelationPair {
  asset_a: string;
  asset_b: string;
  correlation_30d: number;
  classification: string;
  interpretation: string;
}

export interface CorrelationMatrix {
  btc_sp500: CorrelationPair;
  btc_gold: CorrelationPair;
  btc_dxy: CorrelationPair | null; // DXY from FRED, may be unavailable
  sp500_price: number;
  sp500_change_pct: number;
  gold_price: number;
  gold_change_pct: number;
  macro_risk_appetite: 'risk_on' | 'mixed' | 'risk_off';
}

export async function getCorrelationData(): Promise<CorrelationMatrix> {
  // Fetch BTC, S&P 500, and Gold in parallel
  const [btcRes, spRes, goldRes] = await Promise.allSettled([
    fetchYahoo('BTC-USD'),
    fetchYahoo('^GSPC'),
    fetchYahoo('GC=F'),
  ]);

  if (btcRes.status !== 'fulfilled') throw new Error('BTC price data unavailable');
  if (spRes.status !== 'fulfilled') throw new Error('S&P 500 data unavailable');

  const btc = btcRes.value;
  const sp = spRes.value;
  const gold = goldRes.status === 'fulfilled' ? goldRes.value : null;

  // BTC vs S&P 500
  const btcSpCorr = pearsonCorrelation(btc.daily_returns, sp.daily_returns);
  const btcSpClass = classifyCorrelation(btcSpCorr);

  const btcSp500: CorrelationPair = {
    asset_a: 'BTC',
    asset_b: 'S&P 500',
    correlation_30d: Math.round(btcSpCorr * 1000) / 1000,
    classification: btcSpClass,
    interpretation: btcSpCorr > 0.5
      ? 'BTC trading as a risk asset, moving with equities. Equity selloffs will drag BTC.'
      : btcSpCorr > 0.2
      ? 'BTC moderately correlated with equities. Some shared risk sentiment.'
      : btcSpCorr > -0.2
      ? 'BTC decoupled from equities. Trading on its own fundamentals.'
      : 'BTC negatively correlated with equities. Acting as a hedge or divergent asset.',
  };

  // BTC vs Gold
  let btcGold: CorrelationPair;
  if (gold) {
    const btcGoldCorr = pearsonCorrelation(btc.daily_returns, gold.daily_returns);
    const btcGoldClass = classifyCorrelation(btcGoldCorr);
    btcGold = {
      asset_a: 'BTC',
      asset_b: 'Gold',
      correlation_30d: Math.round(btcGoldCorr * 1000) / 1000,
      classification: btcGoldClass,
      interpretation: btcGoldCorr > 0.3
        ? 'BTC moving with gold. "Digital gold" narrative is active. Both benefiting from same macro conditions.'
        : btcGoldCorr > -0.3
        ? 'BTC and gold uncorrelated. Market treating them as separate asset classes.'
        : 'BTC and gold diverging. One is in favor while the other is not. Check which is leading.',
    };
  } else {
    btcGold = {
      asset_a: 'BTC',
      asset_b: 'Gold',
      correlation_30d: 0,
      classification: 'unavailable',
      interpretation: 'Gold data temporarily unavailable.',
    };
  }

  // Macro risk appetite
  const spUp = sp.change_pct > 0;
  const goldUp = gold ? gold.change_pct > 0 : false;
  let macroRiskAppetite: CorrelationMatrix['macro_risk_appetite'] = 'mixed';
  if (spUp && !goldUp) macroRiskAppetite = 'risk_on';
  else if (!spUp && goldUp) macroRiskAppetite = 'risk_off';

  return {
    btc_sp500: btcSp500,
    btc_gold: btcGold,
    btc_dxy: null, // DXY correlation computed separately if FRED data available
    sp500_price: Math.round(sp.current_price * 100) / 100,
    sp500_change_pct: Math.round(sp.change_pct * 100) / 100,
    gold_price: gold ? Math.round(gold.current_price * 100) / 100 : 0,
    gold_change_pct: gold ? Math.round(gold.change_pct * 100) / 100 : 0,
    macro_risk_appetite: macroRiskAppetite,
  };
}
