import type { Context } from 'hono';
import type { Env } from '../types';

/**
 * Generate a server-side fingerprint from IP + User-Agent.
 * Returns a SHA-256 hex hash. This complements the client-side Visitor ID
 * to prevent quota bypass by changing localStorage.
 */
export async function generateFingerprint(c: Context<{ Bindings: Env }>): Promise<string> {
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() || '127.0.0.1';
  const ua = c.req.header('User-Agent') || '';
  const raw = `${ip}|${ua}`;

  const data = new TextEncoder().encode(raw);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
