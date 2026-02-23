import type { Context, MiddlewareHandler } from 'hono';
import type { Env } from '../types';

/**
 * Hash a string using SHA-256 and return hex digest.
 * Used to hash IP addresses so we never store raw IPs.
 */
async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Get the client IP from Cloudflare's CF-Connecting-IP header.
 * Falls back to a fixed key in development.
 */
function getClientIp(c: Context<{ Bindings: Env }>): string {
  return c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() || '127.0.0.1';
}

interface RateLimitOptions {
  /** Rate limit key prefix (e.g. 'global', 'session_create') */
  prefix: string;
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
}

/**
 * Fixed-window rate limiting using KV.
 * KV key format: `rl:{prefix}:{ipHash}:{windowId}`
 * KV value: request count (number as string)
 * TTL: windowSeconds (auto-expires)
 */
async function kvRateCheck(
  kv: KVNamespace,
  options: RateLimitOptions,
  ipHash: string
): Promise<{ count: number }> {
  const windowId = Math.floor(Date.now() / (options.windowSeconds * 1000));
  const key = `rl:${options.prefix}:${ipHash}:${windowId}`;

  const current = await kv.get(key);
  const count = current ? parseInt(current, 10) : 0;

  return { count };
}

async function kvRateIncrement(
  kv: KVNamespace,
  options: RateLimitOptions,
  ipHash: string
): Promise<void> {
  const windowId = Math.floor(Date.now() / (options.windowSeconds * 1000));
  const key = `rl:${options.prefix}:${ipHash}:${windowId}`;

  const current = await kv.get(key);
  const count = current ? parseInt(current, 10) : 0;

  await kv.put(key, (count + 1).toString(), {
    expirationTtl: options.windowSeconds,
  });
}

/**
 * Create a KV-based rate limiting middleware.
 * Uses hashed IP as the rate limit key with fixed time windows.
 * KV TTL handles automatic expiration — no cron cleanup needed.
 */
export function rateLimit(options: RateLimitOptions): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const ip = getClientIp(c);
    const ipHash = await sha256(ip);

    const { count } = await kvRateCheck(c.env.CACHE, options, ipHash);

    // Set rate limit headers
    c.header('X-RateLimit-Limit', options.maxRequests.toString());
    c.header('X-RateLimit-Remaining', Math.max(0, options.maxRequests - count - 1).toString());

    if (count >= options.maxRequests) {
      c.header('Retry-After', options.windowSeconds.toString());
      return c.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        429
      );
    }

    await kvRateIncrement(c.env.CACHE, options, ipHash);

    await next();
  };
}

/**
 * Check rate limit manually in route handlers (KV-based).
 * Returns { limited: true } if rate limit exceeded, { limited: false } otherwise.
 */
export async function checkRateLimit(
  c: Context<{ Bindings: Env }>,
  options: RateLimitOptions
): Promise<{ limited: boolean }> {
  const ip = getClientIp(c);
  const ipHash = await sha256(ip);

  const { count } = await kvRateCheck(c.env.CACHE, options, ipHash);

  c.header('X-RateLimit-Limit', options.maxRequests.toString());
  c.header('X-RateLimit-Remaining', Math.max(0, options.maxRequests - count - 1).toString());

  if (count >= options.maxRequests) {
    c.header('Retry-After', options.windowSeconds.toString());
    return { limited: true };
  }

  await kvRateIncrement(c.env.CACHE, options, ipHash);

  return { limited: false };
}
