interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Periodic garbage collection for memory hygiene
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 60000).unref();

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * In-memory sliding window rate limiter for authentication routes.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { windowMs: 60000, maxRequests: 20 }
): RateLimitResult {
  const now = Date.now();
  const existing = rateLimitStore.get(identifier);

  if (!existing || now > existing.resetAt) {
    const record: RateLimitRecord = {
      count: 1,
      resetAt: now + options.windowMs,
    };
    rateLimitStore.set(identifier, record);
    return {
      success: true,
      limit: options.maxRequests,
      remaining: options.maxRequests - 1,
      reset: record.resetAt,
    };
  }

  existing.count += 1;

  if (existing.count > options.maxRequests) {
    return {
      success: false,
      limit: options.maxRequests,
      remaining: 0,
      reset: existing.resetAt,
    };
  }

  return {
    success: true,
    limit: options.maxRequests,
    remaining: options.maxRequests - existing.count,
    reset: existing.resetAt,
  };
}

