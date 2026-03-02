/**
 * Simple in-memory rate limiter for localhost development.
 * No external dependencies required.
 *
 * For production deployments, consider using Redis-based solutions
 * like @upstash/ratelimit for distributed rate limiting.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetTime) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check if a request should be rate limited.
 *
 * @param key Unique identifier for the rate limit bucket (e.g., IP address, API key)
 * @param config Rate limit configuration
 * @returns Object with success status and metadata
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
} {
  const now = Date.now();
  const entry = store.get(key);

  // If no entry or window expired, create new entry
  if (!entry || now > entry.resetTime) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    store.set(key, newEntry);

    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: newEntry.resetTime,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: entry.resetTime,
    };
  }

  // Increment counter
  entry.count++;

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    reset: entry.resetTime,
  };
}

/**
 * Pre-configured rate limits for different endpoints.
 * Adjust these based on your expected usage patterns.
 */
export const RATE_LIMITS = {
  // Briefing generation is expensive (LLM calls)
  // 10 requests per minute per IP
  briefing: {
    limit: 10,
    windowMs: 60 * 1000, // 1 minute
  },

  // Connection testing is moderately expensive
  // 20 requests per minute per IP
  connectionTest: {
    limit: 20,
    windowMs: 60 * 1000,
  },

  // Operator CRUD operations
  // 30 requests per minute per IP
  operators: {
    limit: 30,
    windowMs: 60 * 1000,
  },

  // Goals updates
  // 20 requests per minute per IP
  goals: {
    limit: 20,
    windowMs: 60 * 1000,
  },

  // Read operations (more lenient)
  // 100 requests per minute per IP
  read: {
    limit: 100,
    windowMs: 60 * 1000,
  },

  (// Chat messages (LLM calls)
  // 30 messages per minute per IP
  chat: {
    limit: 30,
    windowMs: 60 * 1000,
  },

  // Pack import/install/demo operations
  // 20 requests per minute per IP
  packs: {
    limit: 20,
    windowMs: 60 * 1000,
  },
)} as const;

/**
 * Get client identifier for rate limiting.
 * Uses X-Forwarded-For header if behind a proxy, otherwise falls back to a default.
 */
export function getClientId(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // Take the first IP in the chain
    return forwarded.split(",")[0].trim();
  }

  // For localhost, use a default key
  // In production behind a proxy, X-Forwarded-For should be set
  return "localhost";
}
