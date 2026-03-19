// Data proxy routing — paid tiers fetch through api.fathom.fyi/data
// so customers only need FATHOM_API_KEY, no CG_API_KEY or FRED_API_KEY.
// Free tier fetches directly from data sources (zero config).

const PROXY_BASE = 'https://fathom.fyi/api/data';

let proxyEnabled = false;
let fathomKey = '';

export function initProxy(): void {
  fathomKey = process.env.FATHOM_API_KEY ?? '';
  // Enable proxy only if we have a Fathom key (paid tier)
  // User can override with FATHOM_DIRECT=true to force direct calls
  proxyEnabled = !!fathomKey && process.env.FATHOM_DIRECT !== 'true';
}

export function isProxyEnabled(): boolean {
  return proxyEnabled;
}

export async function proxyFetch<T>(source: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(PROXY_BASE);
  url.searchParams.set('source', source);
  url.searchParams.set('key', fathomKey);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Fathom proxy error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}
