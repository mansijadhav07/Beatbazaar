/**
 * Rate limiter interface and in-memory implementation.
 *
 * NOTE: The in-memory store (InMemoryRateLimiter) works for single-process dev
 * and low-traffic single-instance deployments. It does NOT work correctly when
 * multiple worker instances run behind a load balancer because each instance
 * maintains its own independent counter.
 *
 * To scale horizontally, replace this with a shared-store implementation
 * (e.g. RedisRateLimiter using ioredis, or a MongoDB-backed sliding window).
 * Swap by calling setRateLimiter(new RedisRateLimiter(...)) at startup.
 * All callers use checkRateLimit() and never depend on the concrete class.
 */

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix ms timestamp when the window resets
}

/** Plug in any backing store that satisfies this interface. */
export interface RateLimiter {
  check(identifier: string, options: RateLimitOptions): RateLimitResult | Promise<RateLimitResult>;
}

// ---------------------------------------------------------------------------
// Default implementation: in-memory, single-process only
// ---------------------------------------------------------------------------

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export class InMemoryRateLimiter implements RateLimiter {
  private readonly store = new Map<string, RateLimitRecord>();

  constructor() {
    // Periodic GC to prevent unbounded memory growth in long-running processes
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.store.entries()) {
        if (now > record.resetAt) this.store.delete(key);
      }
    }, 60_000).unref();
  }

  check(identifier: string, options: RateLimitOptions): RateLimitResult {
    const now = Date.now();
    const existing = this.store.get(identifier);

    if (!existing || now > existing.resetAt) {
      const record: RateLimitRecord = { count: 1, resetAt: now + options.windowMs };
      this.store.set(identifier, record);
      return { success: true, limit: options.maxRequests, remaining: options.maxRequests - 1, reset: record.resetAt };
    }

    existing.count += 1;

    if (existing.count > options.maxRequests) {
      return { success: false, limit: options.maxRequests, remaining: 0, reset: existing.resetAt };
    }

    return {
      success: true,
      limit: options.maxRequests,
      remaining: options.maxRequests - existing.count,
      reset: existing.resetAt,
    };
  }
}

// ---------------------------------------------------------------------------
// Module-level singleton (swap via setRateLimiter for tests or multi-instance)
// ---------------------------------------------------------------------------

let _limiter: RateLimiter = new InMemoryRateLimiter();

export function setRateLimiter(limiter: RateLimiter): void {
  _limiter = limiter;
}

/**
 * Check a rate limit for an identifier (e.g. IP address, user id, endpoint key).
 * Uses whichever RateLimiter is currently active (default: in-memory).
 */
export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { windowMs: 60_000, maxRequests: 20 }
): Promise<RateLimitResult> {
  return _limiter.check(identifier, options);
}
