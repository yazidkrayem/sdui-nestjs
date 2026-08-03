import { Injectable } from '@nestjs/common';
import { SduiCachePort } from '../../interfaces/sdui-cache.port';

interface Entry {
  value: string;
  expiresAt: number | null;
}

/**
 * Default SduiCachePort used when the host supplies none. Process-local —
 * fine for a single instance/dev use, but caches won't be shared across a
 * multi-instance deployment (same trade-off as any non-shared cache). All
 * SDUI call sites already fall through to Postgres on a cache miss.
 */
@Injectable()
export class SduiInMemoryCacheAdapter implements SduiCachePort {
  private readonly store = new Map<string, Entry>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  async del(...keys: string[]): Promise<void> {
    for (const key of keys) this.store.delete(key);
  }

  async incr(key: string): Promise<number> {
    const current = Number((await this.get(key)) ?? '0');
    const next = current + 1;
    const existing = this.store.get(key);
    this.store.set(key, {
      value: String(next),
      expiresAt: existing?.expiresAt ?? null,
    });
    return next;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = globToRegExp(pattern);
    const now = Date.now();
    const matches: string[] = [];
    for (const [key, entry] of this.store) {
      if (entry.expiresAt !== null && entry.expiresAt <= now) {
        this.store.delete(key);
        continue;
      }
      if (regex.test(key)) matches.push(key);
    }
    return matches;
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }
}

/** Translates Redis KEYS-style glob (`*`, `?`) into a RegExp. */
function globToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const withWildcards = escaped.replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${withWildcards}$`);
}
