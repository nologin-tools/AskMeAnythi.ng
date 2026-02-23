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
 * Create a D1-based rate limiting middleware.
 * Uses hashed IP as the rate limit key.
 */
export function rateLimit(options: RateLimitOptions): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const ip = getClientIp(c);
    const ipHash = await sha256(ip);
    const key = `${options.prefix}:${ipHash}`;
    const now = Date.now();
    const windowStart = now - options.windowSeconds * 1000;

    // Count requests in the current window
    const result = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM rate_limits WHERE key = ? AND created_at > ?'
    ).bind(key, windowStart).first<{ count: number }>();

    const count = result?.count ?? 0;

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

    // Record this request
    await c.env.DB.prepare(
      'INSERT INTO rate_limits (key, created_at) VALUES (?, ?)'
    ).bind(key, now).run();

    await next();
  };
}

/**
 * Create a rate limiter that can be called manually in route handlers.
 * Returns { limited: true } if rate limit exceeded, { limited: false } otherwise.
 */
export async function checkRateLimit(
  c: Context<{ Bindings: Env }>,
  options: RateLimitOptions
): Promise<{ limited: boolean }> {
  const ip = getClientIp(c);
  const ipHash = await sha256(ip);
  const key = `${options.prefix}:${ipHash}`;
  const now = Date.now();
  const windowStart = now - options.windowSeconds * 1000;

  const result = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM rate_limits WHERE key = ? AND created_at > ?'
  ).bind(key, windowStart).first<{ count: number }>();

  const count = result?.count ?? 0;

  c.header('X-RateLimit-Limit', options.maxRequests.toString());
  c.header('X-RateLimit-Remaining', Math.max(0, options.maxRequests - count - 1).toString());

  if (count >= options.maxRequests) {
    c.header('Retry-After', options.windowSeconds.toString());
    return { limited: true };
  }

  await c.env.DB.prepare(
    'INSERT INTO rate_limits (key, created_at) VALUES (?, ?)'
  ).bind(key, now).run();

  return { limited: false };
}
