const STABLECOINS_URL = 'https://stablecoins.llama.fi/stablecoins?includePrices=true';

interface LlamaStablecoin {
  id: string;
  name: string;
  symbol: string;
  pegType: string;
  pegMechanism: string;
  circulating: { peggedUSD: number };
  circulatingPrevDay: { peggedUSD: number };
  circulatingPrevWeek: { peggedUSD: number };
  circulatingPrevMonth: { peggedUSD: number };
  price: number | null;
}

interface LlamaStablecoinsResponse {
  peggedAssets: LlamaStablecoin[];
}

export interface StablecoinEntry {
  name: string;
  symbol: string;
  circulating_usd: number;
  change_24h_usd: number;
  change_7d_usd: number;
  change_30d_usd: number;
  change_24h_pct: number;
  change_7d_pct: number;
  change_30d_pct: number;
  peg_price: number | null;
  depeg_risk: boolean;
}

export interface StablecoinFlows {
  total_supply_usd: number;
  total_change_24h_usd: number;
  total_change_7d_usd: number;
  total_change_30d_usd: number;
  total_change_24h_pct: number;
  total_change_7d_pct: number;
  total_change_30d_pct: number;
  net_flow_signal: 'strong_inflow' | 'inflow' | 'neutral' | 'outflow' | 'strong_outflow';
  top_stablecoins: StablecoinEntry[];
  depeg_warnings: string[];
}

export async function getStablecoinData(): Promise<StablecoinFlows> {
  const res = await fetch(STABLECOINS_URL, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`DeFiLlama stablecoins returned ${res.status}`);

  const data = await res.json() as LlamaStablecoinsResponse;
  const stables = data.peggedAssets || [];

  // Sort by circulating supply
  const sorted = stables
    .filter(s => s.circulating?.peggedUSD > 100_000_000) // Only stables with >$100M
    .sort((a, b) => (b.circulating?.peggedUSD ?? 0) - (a.circulating?.peggedUSD ?? 0));

  let totalSupply = 0;
  let totalChange24h = 0;
  let totalChange7d = 0;
  let totalChange30d = 0;
  const depegWarnings: string[] = [];
  const entries: StablecoinEntry[] = [];

  for (const s of sorted) {
    const circ = s.circulating?.peggedUSD ?? 0;
    const prev24h = s.circulatingPrevDay?.peggedUSD ?? circ;
    const prev7d = s.circulatingPrevWeek?.peggedUSD ?? circ;
    const prev30d = s.circulatingPrevMonth?.peggedUSD ?? circ;

    const change24h = circ - prev24h;
    const change7d = circ - prev7d;
    const change30d = circ - prev30d;

    totalSupply += circ;
    totalChange24h += change24h;
    totalChange7d += change7d;
    totalChange30d += change30d;

    const depeg = s.price !== null && (s.price < 0.98 || s.price > 1.02);
    if (depeg) depegWarnings.push(`${s.symbol} trading at $${s.price?.toFixed(4)} — potential depeg`);

    entries.push({
      name: s.name,
      symbol: s.symbol,
      circulating_usd: Math.round(circ),
      change_24h_usd: Math.round(change24h),
      change_7d_usd: Math.round(change7d),
      change_30d_usd: Math.round(change30d),
      change_24h_pct: prev24h > 0 ? Math.round((change24h / prev24h) * 10000) / 100 : 0,
      change_7d_pct: prev7d > 0 ? Math.round((change7d / prev7d) * 10000) / 100 : 0,
      change_30d_pct: prev30d > 0 ? Math.round((change30d / prev30d) * 10000) / 100 : 0,
      peg_price: s.price !== null ? Math.round(s.price * 10000) / 10000 : null,
      depeg_risk: depeg,
    });
  }

  const totalChange24hPct = totalSupply > 0 ? (totalChange24h / (totalSupply - totalChange24h)) * 100 : 0;
  const totalChange7dPct = totalSupply > 0 ? (totalChange7d / (totalSupply - totalChange7d)) * 100 : 0;
  const totalChange30dPct = totalSupply > 0 ? (totalChange30d / (totalSupply - totalChange30d)) * 100 : 0;

  // Determine flow signal based on 7d change
  let netFlowSignal: StablecoinFlows['net_flow_signal'] = 'neutral';
  if (totalChange7dPct > 2) netFlowSignal = 'strong_inflow';
  else if (totalChange7dPct > 0.5) netFlowSignal = 'inflow';
  else if (totalChange7dPct < -2) netFlowSignal = 'strong_outflow';
  else if (totalChange7dPct < -0.5) netFlowSignal = 'outflow';

  return {
    total_supply_usd: Math.round(totalSupply),
    total_change_24h_usd: Math.round(totalChange24h),
    total_change_7d_usd: Math.round(totalChange7d),
    total_change_30d_usd: Math.round(totalChange30d),
    total_change_24h_pct: Math.round(totalChange24hPct * 100) / 100,
    total_change_7d_pct: Math.round(totalChange7dPct * 100) / 100,
    total_change_30d_pct: Math.round(totalChange30dPct * 100) / 100,
    net_flow_signal: netFlowSignal,
    top_stablecoins: entries.slice(0, 8),
    depeg_warnings: depegWarnings,
  };
}
