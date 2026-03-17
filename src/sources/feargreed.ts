import type { FearGreedResponse } from '../types/index.js';

const BASE_URL = 'https://api.alternative.me/fng';

export async function getFearGreed(limit = 7): Promise<FearGreedResponse> {
  const res = await fetch(`${BASE_URL}/?limit=${limit}&format=json`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Fear & Greed API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<FearGreedResponse>;
}

export function getFearGreedLabel(value: number): string {
  if (value <= 24) return 'Extreme Fear';
  if (value <= 49) return 'Fear';
  if (value <= 74) return 'Greed';
  return 'Extreme Greed';
}
