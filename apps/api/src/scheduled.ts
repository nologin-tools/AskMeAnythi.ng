import type { Env } from './types';

const BATCH_SIZE = 50;

export async function handleScheduled(env: Env): Promise<void> {
  const now = Date.now();

  // Find expired or soft-deleted sessions
  const expiredSessions = await env.DB.prepare(`
    SELECT id FROM sessions
    WHERE (expires_at < ? OR deleted_at IS NOT NULL)
  `).bind(now).all<{ id: string }>();

  const sessionIds = expiredSessions.results?.map(s => s.id) || [];
  if (sessionIds.length === 0) return;

  // Process in batches to avoid exceeding D1 parameter limits
  for (let i = 0; i < sessionIds.length; i += BATCH_SIZE) {
    const batch = sessionIds.slice(i, i + BATCH_SIZE);
    const placeholders = batch.map(() => '?').join(',');

    // Delete associated data atomically using batch
    await env.DB.batch([
      env.DB.prepare(`
        DELETE FROM reactions WHERE target_id IN (
          SELECT id FROM questions WHERE session_id IN (${placeholders})
        ) OR target_id IN (
          SELECT id FROM answers WHERE session_id IN (${placeholders})
        )
      `).bind(...batch, ...batch),
      env.DB.prepare(`
        DELETE FROM votes WHERE question_id IN (
          SELECT id FROM questions WHERE session_id IN (${placeholders})
        )
      `).bind(...batch),
      env.DB.prepare(
        `DELETE FROM answers WHERE session_id IN (${placeholders})`
      ).bind(...batch),
      env.DB.prepare(
        `DELETE FROM questions WHERE session_id IN (${placeholders})`
      ).bind(...batch),
      env.DB.prepare(
        `DELETE FROM sessions WHERE id IN (${placeholders})`
      ).bind(...batch),
    ]);
  }

  console.log(`Cleaned up ${sessionIds.length} expired/deleted sessions`);

  // Clean up old rate limit records (older than 1 hour)
  const rateLimitCutoff = now - 60 * 60 * 1000;
  const rateLimitResult = await env.DB.prepare(
    'DELETE FROM rate_limits WHERE created_at < ?'
  ).bind(rateLimitCutoff).run();
  console.log(`Cleaned up rate limit records older than 1 hour`);
}
