const BASE_URL = 'https://www.deribit.com/api/v2/public';

async function deribitFetch<T>(path: string, retries = 2): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      if (res.status === 429 && attempt < retries) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }
      if (!res.ok) throw new Error(`Deribit ${path} returned ${res.status}`);
      const json = await res.json() as { result: T };
      return json.result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
  }
  throw lastError ?? new Error(`Deribit ${path} request failed`);
}

// ─── Funding Rates ───

interface DeribitFundingRate {
  instrument_name: string;
  current_funding: number;   // 8h rate as decimal (e.g. 0.0001 = 0.01%)
  funding_8h: number;
}

export interface FundingSnapshot {
  asset: string;
  current_rate_8h: number;       // raw 8h rate
  annualized_rate: number;       // annualized %
  sentiment: 'extreme_long' | 'long_bias' | 'neutral' | 'short_bias' | 'extreme_short';
}

export async function getFundingRates(): Promise<FundingSnapshot[]> {
  const symbols = ['BTC', 'ETH', 'SOL'];
  const results: FundingSnapshot[] = [];

  for (const symbol of symbols) {
    try {
      const ticker = await deribitFetch<{
        funding_8h: number;
        current_funding: number;
        instrument_name: string;
      }>(`/ticker?instrument_name=${symbol}-PERPETUAL`);

      const rate8h = ticker.funding_8h || ticker.current_funding;
      const annualized = rate8h * 3 * 365 * 100; // 3 funding periods/day * 365 days * 100 for %

      let sentiment: FundingSnapshot['sentiment'] = 'neutral';
      if (annualized > 50) sentiment = 'extreme_long';
      else if (annualized > 15) sentiment = 'long_bias';
      else if (annualized < -50) sentiment = 'extreme_short';
      else if (annualized < -15) sentiment = 'short_bias';

      results.push({
        asset: symbol,
        current_rate_8h: rate8h,
        annualized_rate: Math.round(annualized * 100) / 100,
        sentiment,
      });
    } catch {
      // Skip assets that fail (SOL perpetual may not exist on Deribit)
    }
  }

  return results;
}

// ─── Options Data ───

interface DeribitOptionSummary {
  instrument_name: string;
  open_interest: number;         // in BTC
  volume: number;
  bid_price: number;
  ask_price: number;
  mark_iv: number;               // implied volatility
  underlying_price: number;
}

export interface OptionsSnapshot {
  currency: string;
  total_open_interest_usd: number;
  total_volume_24h_usd: number;
  put_call_ratio: number;
  avg_implied_volatility: number;
  max_pain_price: number;
  nearest_expiry: string;
  sentiment: 'extremely_bearish' | 'bearish' | 'neutral' | 'bullish' | 'extremely_bullish';
}

export async function getOptionsData(currency: 'BTC' | 'ETH' = 'BTC'): Promise<OptionsSnapshot> {
  const options = await deribitFetch<DeribitOptionSummary[]>(
    `/get_book_summary_by_currency?currency=${currency}&kind=option`
  );

  if (!options || options.length === 0) {
    throw new Error(`No options data for ${currency}`);
  }

  const underlyingPrice = options[0].underlying_price;

  let totalPutOI = 0;
  let totalCallOI = 0;
  let totalOI = 0;
  let totalVolume = 0;
  let ivSum = 0;
  let ivCount = 0;

  // For max pain calculation: accumulate OI at each strike
  const strikeOI = new Map<number, { calls: number; puts: number }>();

  // Find nearest expiry
  let nearestExpiry = '';
  let nearestExpiryMs = Infinity;
  const now = Date.now();

  for (const opt of options) {
    const oi = opt.open_interest;
    const vol = opt.volume;
    const name = opt.instrument_name; // e.g. BTC-28MAR26-85000-C

    const parts = name.split('-');
    if (parts.length < 4) continue;

    const expiryStr = parts[1];
    const strike = parseFloat(parts[2]);
    const type = parts[3]; // C or P

    // Parse expiry date
    const expiryDate = parseDeribitExpiry(expiryStr);
    if (expiryDate && expiryDate > now && expiryDate < nearestExpiryMs) {
      nearestExpiryMs = expiryDate;
      nearestExpiry = expiryStr;
    }

    // Skip expired options
    if (expiryDate && expiryDate < now) continue;

    totalOI += oi;
    totalVolume += vol;

    if (type === 'C') totalCallOI += oi;
    else if (type === 'P') totalPutOI += oi;

    // Strike OI for max pain
    if (!strikeOI.has(strike)) strikeOI.set(strike, { calls: 0, puts: 0 });
    const s = strikeOI.get(strike)!;
    if (type === 'C') s.calls += oi;
    else s.puts += oi;

    // IV (only count options with meaningful OI)
    if (oi > 0.1 && opt.mark_iv > 0) {
      ivSum += opt.mark_iv;
      ivCount++;
    }
  }

  const putCallRatio = totalCallOI > 0 ? totalPutOI / totalCallOI : 0;
  const avgIV = ivCount > 0 ? ivSum / ivCount : 0;
  const totalOIUsd = totalOI * underlyingPrice;
  const totalVolumeUsd = totalVolume * underlyingPrice;

  // Max pain: strike price where option holders would lose the most
  const maxPain = calculateMaxPain(strikeOI, underlyingPrice);

  // Sentiment from put/call ratio
  let sentiment: OptionsSnapshot['sentiment'] = 'neutral';
  if (putCallRatio > 1.5) sentiment = 'extremely_bearish';
  else if (putCallRatio > 1.0) sentiment = 'bearish';
  else if (putCallRatio < 0.5) sentiment = 'extremely_bullish';
  else if (putCallRatio < 0.7) sentiment = 'bullish';

  return {
    currency,
    total_open_interest_usd: Math.round(totalOIUsd),
    total_volume_24h_usd: Math.round(totalVolumeUsd),
    put_call_ratio: Math.round(putCallRatio * 1000) / 1000,
    avg_implied_volatility: Math.round(avgIV * 100) / 100,
    max_pain_price: maxPain,
    nearest_expiry: nearestExpiry,
    sentiment,
  };
}

function parseDeribitExpiry(expiry: string): number | null {
  // Format: 28MAR26
  const months: Record<string, number> = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
  };
  const match = expiry.match(/^(\d{1,2})([A-Z]{3})(\d{2})$/);
  if (!match) return null;
  const day = parseInt(match[1]);
  const month = months[match[2]];
  const year = 2000 + parseInt(match[3]);
  if (month === undefined) return null;
  return new Date(year, month, day, 8, 0, 0).getTime(); // 08:00 UTC expiry
}

function calculateMaxPain(
  strikeOI: Map<number, { calls: number; puts: number }>,
  underlyingPrice: number,
): number {
  // Max pain = strike where total pain (loss to option holders) is maximized
  // For each candidate strike, compute total intrinsic value of all ITM options
  const strikes = Array.from(strikeOI.keys()).sort((a, b) => a - b);
  if (strikes.length === 0) return underlyingPrice;

  // Filter to reasonable strikes (within 2x of current price)
  const reasonable = strikes.filter(s => s > underlyingPrice * 0.3 && s < underlyingPrice * 3);
  if (reasonable.length === 0) return underlyingPrice;

  let minPain = Infinity;
  let maxPainStrike = underlyingPrice;

  for (const candidateStrike of reasonable) {
    let totalPain = 0;
    for (const [strike, oi] of strikeOI.entries()) {
      // Call holders lose if price < strike
      if (candidateStrike > strike) {
        totalPain += oi.calls * (candidateStrike - strike);
      }
      // Put holders lose if price > strike
      if (candidateStrike < strike) {
        totalPain += oi.puts * (strike - candidateStrike);
      }
    }
    if (totalPain < minPain) {
      minPain = totalPain;
      maxPainStrike = candidateStrike;
    }
  }

  return maxPainStrike;
}

// ─── Combined Derivatives Data ───

export interface DerivativesData {
  funding_rates: FundingSnapshot[];
  options_btc: OptionsSnapshot;
  options_eth: OptionsSnapshot | null;
}

export async function getDerivativesData(): Promise<DerivativesData> {
  const [funding, optsBtc, optsEth] = await Promise.allSettled([
    getFundingRates(),
    getOptionsData('BTC'),
    getOptionsData('ETH'),
  ]);

  return {
    funding_rates: funding.status === 'fulfilled' ? funding.value : [],
    options_btc: optsBtc.status === 'fulfilled' ? optsBtc.value : {
      currency: 'BTC', total_open_interest_usd: 0, total_volume_24h_usd: 0,
      put_call_ratio: 0, avg_implied_volatility: 0, max_pain_price: 0,
      nearest_expiry: '', sentiment: 'neutral' as const,
    },
    options_eth: optsEth.status === 'fulfilled' ? optsEth.value : null,
  };
}
