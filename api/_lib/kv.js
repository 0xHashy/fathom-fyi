// Upstash Redis REST API helper (Vercel KV uses Upstash under the hood)
// No dependencies — pure fetch.
//
// Env vars required:
//   KV_REST_API_URL   — from Vercel KV store
//   KV_REST_API_TOKEN — from Vercel KV store
//
// Falls back to FATHOM_KEYS env var if KV is not configured.

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function kvCommand(...args) {
  if (!KV_URL || !KV_TOKEN) return null;

  const res = await fetch(KV_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.result ?? null;
}

export async function kvSet(key, value, exSeconds) {
  if (exSeconds) {
    return kvCommand('SET', key, JSON.stringify(value), 'EX', exSeconds);
  }
  return kvCommand('SET', key, JSON.stringify(value));
}

export async function kvGet(key) {
  const raw = await kvCommand('GET', key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

export async function kvDel(key) {
  return kvCommand('DEL', key);
}

export async function kvLpush(key, value) {
  return kvCommand('LPUSH', key, JSON.stringify(value));
}

export async function kvLtrim(key, start, stop) {
  return kvCommand('LTRIM', key, start, stop);
}

export async function kvLrange(key, start, stop) {
  const raw = await kvCommand('LRANGE', key, start, stop);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => { try { return JSON.parse(item); } catch { return item; } });
}

// Fallback: check FATHOM_KEYS env var (legacy)
export function kvFallbackLookup(apiKey) {
  try {
    const raw = process.env.FATHOM_KEYS;
    if (!raw) return null;
    const keys = JSON.parse(raw);
    return keys[apiKey] ? { tier: keys[apiKey], active: true } : null;
  } catch {
    return null;
  }
}

export function isKvConfigured() {
  return !!(KV_URL && KV_TOKEN);
}
