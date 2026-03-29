// Data proxy routing — paid tiers fetch through fathom.fyi/api/data
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

// ─── Client-side concurrency limiter ───
// Prevents stampeding the proxy with 19 simultaneous requests on cold start.
// Max 3 concurrent proxy calls — the rest queue up and execute in order.
const queue: Array<{ fn: () => Promise<unknown>; resolve: (v: unknown) => void; reject: (e: unknown) => void }> = [];
let active = 0;
const MAX_CONCURRENT = 3;

function processQueue(): void {
  while (active < MAX_CONCURRENT && queue.length > 0) {
    const item = queue.shift()!;
    active++;
    item.fn()
      .then(item.resolve)
      .catch(item.reject)
      .finally(() => {
        active--;
        processQueue();
      });
  }
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push({ fn: fn as () => Promise<unknown>, resolve: resolve as (v: unknown) => void, reject });
    processQueue();
  });
}

// ─── Proxy fetch with retry + concurrency limiting ───
async function proxyFetchInner<T>(source: string, params: Record<string, string | number>): Promise<T> {
  const url = new URL(PROXY_BASE);
  url.searchParams.set('source', source);
  url.searchParams.set('key', fathomKey);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });

      if (res.status === 429 || res.status === 502) {
        // Rate limited or proxy overloaded — back off and retry
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000 + Math.random() * 500));
          continue;
        }
      }

      if (!res.ok) {
        throw new Error(`Fathom proxy error: ${res.status}`);
      }

      return res.json() as Promise<T>;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000 + Math.random() * 500));
      }
    }
  }
  throw lastError ?? new Error('Fathom proxy request failed');
}

export async function proxyFetch<T>(source: string, params: Record<string, string | number> = {}): Promise<T> {
  return enqueue(() => proxyFetchInner<T>(source, params));
}
