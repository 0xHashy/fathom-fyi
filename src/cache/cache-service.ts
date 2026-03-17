interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

export class CacheService {
  private store = new Map<string, CacheEntry<unknown>>();
  private enabled: boolean;

  constructor(enabled = true) {
    this.enabled = enabled;
  }

  set<T>(key: string, data: T, ttlSeconds: number): void {
    if (!this.enabled) return;
    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttlMs: ttlSeconds * 1000,
    });
  }

  get<T>(key: string): { data: T; ageSeconds: number } | null {
    if (!this.enabled) return null;
    const entry = this.store.get(key);
    if (!entry) return null;

    const ageMs = Date.now() - entry.timestamp;
    if (ageMs > entry.ttlMs) {
      this.store.delete(key);
      return null;
    }

    return {
      data: entry.data as T,
      ageSeconds: Math.round(ageMs / 1000),
    };
  }

  isStale(key: string): boolean {
    if (!this.enabled) return true;
    const entry = this.store.get(key);
    if (!entry) return true;
    return Date.now() - entry.timestamp > entry.ttlMs;
  }

  clear(): void {
    this.store.clear();
  }
}
