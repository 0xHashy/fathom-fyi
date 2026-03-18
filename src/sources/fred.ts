import type { FredResponse } from '../types/index.js';

const BASE_URL = 'https://api.stlouisfed.org/fred';

async function fetchFredSeries(seriesId: string, limit = 5): Promise<FredResponse> {
  const key = process.env.FRED_API_KEY;
  if (!key) throw new Error('FRED_API_KEY not set — macro data unavailable. Add a free key from https://fred.stlouisfed.org/docs/api/api_key.html');

  const url = `${BASE_URL}/series/observations?series_id=${encodeURIComponent(seriesId)}&api_key=${key}&file_type=json&sort_order=desc&limit=${limit}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    // Sanitize error — never leak the full URL (contains API key)
    throw new Error(`FRED data temporarily unavailable for series ${seriesId}`);
  }
  return res.json() as Promise<FredResponse>;
}

function parseLatestValue(response: FredResponse): number | null {
  for (const obs of response.observations) {
    const val = parseFloat(obs.value);
    if (!isNaN(val)) return val;
  }
  return null;
}

function parseTwoValues(response: FredResponse): [number, number] | null {
  const values: number[] = [];
  for (const obs of response.observations) {
    const val = parseFloat(obs.value);
    if (!isNaN(val)) {
      values.push(val);
      if (values.length === 2) break;
    }
  }
  return values.length >= 2 ? [values[0], values[1]] : null;
}

export interface MacroData {
  fedFundsRate: number | null;
  fedFundsTrend: 'hiking' | 'holding' | 'cutting';
  dxyValue: number | null;
  dxyTrend: 'strengthening' | 'stable' | 'weakening';
  yieldCurve: number | null;
  yieldCurveState: 'normal' | 'flat' | 'inverted';
}

export async function getMacroData(): Promise<MacroData> {
  const [fedRes, dxyRes, yieldRes] = await Promise.allSettled([
    fetchFredSeries('DFF'),
    fetchFredSeries('DTWEXBGS'),
    fetchFredSeries('T10Y2Y'),
  ]);

  // Federal Funds Rate
  let fedFundsRate: number | null = null;
  let fedFundsTrend: 'hiking' | 'holding' | 'cutting' = 'holding';
  if (fedRes.status === 'fulfilled') {
    fedFundsRate = parseLatestValue(fedRes.value);
    const two = parseTwoValues(fedRes.value);
    if (two) {
      const diff = two[0] - two[1];
      if (diff > 0.1) fedFundsTrend = 'hiking';
      else if (diff < -0.1) fedFundsTrend = 'cutting';
    }
  }

  // DXY
  let dxyValue: number | null = null;
  let dxyTrend: 'strengthening' | 'stable' | 'weakening' = 'stable';
  if (dxyRes.status === 'fulfilled') {
    dxyValue = parseLatestValue(dxyRes.value);
    const two = parseTwoValues(dxyRes.value);
    if (two) {
      const pctChange = ((two[0] - two[1]) / two[1]) * 100;
      if (pctChange > 0.5) dxyTrend = 'strengthening';
      else if (pctChange < -0.5) dxyTrend = 'weakening';
    }
  }

  // Yield Curve
  let yieldCurve: number | null = null;
  let yieldCurveState: 'normal' | 'flat' | 'inverted' = 'normal';
  if (yieldRes.status === 'fulfilled') {
    yieldCurve = parseLatestValue(yieldRes.value);
    if (yieldCurve !== null) {
      if (yieldCurve < -0.2) yieldCurveState = 'inverted';
      else if (yieldCurve < 0.2) yieldCurveState = 'flat';
    }
  }

  return { fedFundsRate, fedFundsTrend, dxyValue, dxyTrend, yieldCurve, yieldCurveState };
}
