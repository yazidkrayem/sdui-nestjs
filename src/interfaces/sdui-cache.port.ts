/**
 * Cache used for manifest/nav/strings caching and preview-token storage.
 * Every call site in SDUI already treats this as best-effort and falls through
 * to Postgres on failure/miss — a host with no cache at all can safely use the
 * shipped in-memory default (see adapters/default/in-memory-cache.adapter.ts).
 */
export interface SduiCachePort {
  get(key: string): Promise<string | null>;
  /** Sets a key with an optional TTL in seconds. */
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(...keys: string[]): Promise<void>;
  /** Atomically increments a counter, creating it at 1 if absent. */
  incr(key: string): Promise<number>;
  /** Glob-style pattern match (Redis KEYS semantics: `*` and `?` wildcards). */
  keys(pattern: string): Promise<string[]>;
  isHealthy(): Promise<boolean>;
}
