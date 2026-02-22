export async function verifyAdminToken(db: D1Database, sessionId: string, token: string): Promise<boolean> {
  const result = await db.prepare(
    'SELECT admin_token FROM sessions WHERE id = ? AND deleted_at IS NULL'
  ).bind(sessionId).first<{ admin_token: string }>();

  if (!result) return false;

  // Constant-time comparison to prevent timing attacks
  const encoder = new TextEncoder();
  const a = encoder.encode(result.admin_token);
  const b = encoder.encode(token);
  if (a.length !== b.length) return false;

  return crypto.subtle.timingSafeEqual(a, b);
}
