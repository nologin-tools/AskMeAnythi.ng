import { Hono } from 'hono';
import type { Env, SessionRow } from '../types';
import {
  generateSessionId,
  generateAdminToken,
  DEFAULT_TTL_DAYS,
  DEFAULT_TITLE,
  MIN_TTL_DAYS,
  MAX_TTL_DAYS,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  DEFAULT_MAX_QUESTIONS_PER_VISITOR,
  DEFAULT_RATE_LIMIT_COUNT,
  DEFAULT_RATE_LIMIT_WINDOW,
  MAX_QUESTIONS_PER_VISITOR_LIMIT,
  MAX_RATE_LIMIT_COUNT,
  MIN_RATE_LIMIT_WINDOW,
  MAX_RATE_LIMIT_WINDOW,
} from '@askmeanything/shared';
import type {
  Session,
  CreateSessionRequest,
  CreateSessionResponse,
  UpdateSessionRequest,
  ApiResponse,
} from '@askmeanything/shared';
import { verifyAdminToken } from '../utils/auth';
import { checkRateLimit } from '../middleware/rate-limit';

export const sessionsRouter = new Hono<{ Bindings: Env }>();

// 转换数据库行到 Session 类型
function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    requireModeration: row.require_moderation === 1,
    ttlDays: row.ttl_days,
    maxQuestionsPerVisitor: row.max_questions_per_visitor ?? 0,
    rateLimitCount: row.rate_limit_count ?? 0,
    rateLimitWindow: row.rate_limit_window ?? 60,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function clampTtlDays(value: number | undefined): number {
  return Math.max(MIN_TTL_DAYS, Math.min(value ?? DEFAULT_TTL_DAYS, MAX_TTL_DAYS));
}

function clampInt(value: number | undefined, defaultVal: number, min: number, max: number): number {
  return Math.max(min, Math.min(value ?? defaultVal, max));
}

// 创建活动
sessionsRouter.post('/', async (c) => {
  // Session creation rate limit: 10 per hour per IP
  const { limited } = await checkRateLimit(c, { prefix: 'session_create', maxRequests: 10, windowSeconds: 3600 });
  if (limited) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Too many sessions created. Please try again later.' }, 429);
  }

  const body: CreateSessionRequest = await c.req.json<CreateSessionRequest>().catch(() => ({}));

  if (body.title && body.title.length > MAX_TITLE_LENGTH) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: `Title must not exceed ${MAX_TITLE_LENGTH} characters`,
    }, 400);
  }

  if (body.description && body.description.length > MAX_DESCRIPTION_LENGTH) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: `Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`,
    }, 400);
  }

  const adminToken = generateAdminToken();
  const now = Date.now();
  const ttlDays = clampTtlDays(body.ttlDays);
  const expiresAt = now + ttlDays * 24 * 60 * 60 * 1000;
  const title = body.title?.trim() || DEFAULT_TITLE;
  const maxQuestionsPerVisitor = clampInt(body.maxQuestionsPerVisitor, DEFAULT_MAX_QUESTIONS_PER_VISITOR, 0, MAX_QUESTIONS_PER_VISITOR_LIMIT);
  const rateLimitCount = clampInt(body.rateLimitCount, DEFAULT_RATE_LIMIT_COUNT, 0, MAX_RATE_LIMIT_COUNT);
  const rateLimitWindow = clampInt(body.rateLimitWindow, DEFAULT_RATE_LIMIT_WINDOW, MIN_RATE_LIMIT_WINDOW, MAX_RATE_LIMIT_WINDOW);

  // Retry on session ID collision (up to 3 attempts)
  let id = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    id = generateSessionId();
    try {
      await c.env.DB.prepare(`
        INSERT INTO sessions (id, admin_token, title, description, require_moderation, ttl_days, max_questions_per_visitor, rate_limit_count, rate_limit_window, expires_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        adminToken,
        title,
        body.description ?? null,
        body.requireModeration ? 1 : 0,
        ttlDays,
        maxQuestionsPerVisitor,
        rateLimitCount,
        rateLimitWindow,
        expiresAt,
        now,
        now
      ).run();
      break; // success
    } catch (err: any) {
      if (attempt === 2 || !err.message?.includes('UNIQUE')) {
        throw err;
      }
      // retry with a new ID
    }
  }

  const session: Session = {
    id,
    title,
    description: body.description,
    requireModeration: body.requireModeration ?? false,
    ttlDays,
    maxQuestionsPerVisitor,
    rateLimitCount,
    rateLimitWindow,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  };

  const response: CreateSessionResponse = {
    session,
    adminToken,
    adminUrl: `/s/${id}/admin#${adminToken}`,
    publicUrl: `/s/${id}`,
  };

  return c.json<ApiResponse<CreateSessionResponse>>({
    success: true,
    data: response,
  }, 201);
});

// 获取活动信息（公开）
sessionsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');

  const row = await c.env.DB.prepare(
    'SELECT * FROM sessions WHERE id = ? AND deleted_at IS NULL'
  ).bind(id).first<SessionRow>();

  if (!row) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Session not found',
    }, 404);
  }

  // 检查是否过期
  if (row.expires_at < Date.now()) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Session expired',
    }, 410);
  }

  return c.json<ApiResponse<Session>>({
    success: true,
    data: rowToSession(row),
  });
});

// 获取活动信息（管理员，包含敏感信息）— merged into single query
sessionsRouter.get('/:id/admin', async (c) => {
  const id = c.req.param('id');
  const token = c.req.header('X-Admin-Token');

  if (!token) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Admin token required',
    }, 401);
  }

  const row = await c.env.DB.prepare(
    'SELECT * FROM sessions WHERE id = ? AND deleted_at IS NULL'
  ).bind(id).first<SessionRow>();

  if (!row) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Session not found',
    }, 404);
  }

  // Constant-time comparison inline
  const encoder = new TextEncoder();
  const a = encoder.encode(row.admin_token);
  const b = encoder.encode(token);
  const isValid = a.length === b.length && crypto.subtle.timingSafeEqual(a, b);

  if (!isValid) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Invalid admin token',
    }, 403);
  }

  return c.json<ApiResponse<Session & { adminToken: string }>>({
    success: true,
    data: {
      ...rowToSession(row),
      adminToken: row.admin_token,
    },
  });
});

// 更新活动设置
sessionsRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const token = c.req.header('X-Admin-Token');

  if (!token) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Admin token required',
    }, 401);
  }

  const isValid = await verifyAdminToken(c.env.DB, id, token);
  if (!isValid) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Invalid admin token',
    }, 403);
  }

  const body = await c.req.json<UpdateSessionRequest>().catch((): UpdateSessionRequest => ({}));

  if (body.title !== undefined && body.title.length > MAX_TITLE_LENGTH) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: `Title must not exceed ${MAX_TITLE_LENGTH} characters`,
    }, 400);
  }

  if (body.description !== undefined && body.description && body.description.length > MAX_DESCRIPTION_LENGTH) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: `Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`,
    }, 400);
  }

  const now = Date.now();
  const updates: string[] = ['updated_at = ?'];
  const values: (string | number | null)[] = [now];

  if (body.title !== undefined) {
    updates.push('title = ?');
    values.push(body.title.trim() || DEFAULT_TITLE);
  }
  if (body.description !== undefined) {
    updates.push('description = ?');
    values.push(body.description || null);
  }
  if (body.requireModeration !== undefined) {
    updates.push('require_moderation = ?');
    values.push(body.requireModeration ? 1 : 0);
  }
  if (body.ttlDays !== undefined) {
    const ttlDays = clampTtlDays(body.ttlDays);
    // 获取当前创建时间
    const row = await c.env.DB.prepare('SELECT created_at FROM sessions WHERE id = ?').bind(id).first<{ created_at: number }>();
    if (row) {
      const newExpiresAt = row.created_at + ttlDays * 24 * 60 * 60 * 1000;
      updates.push('ttl_days = ?', 'expires_at = ?');
      values.push(ttlDays, newExpiresAt);
    }
  }
  if (body.maxQuestionsPerVisitor !== undefined) {
    updates.push('max_questions_per_visitor = ?');
    values.push(clampInt(body.maxQuestionsPerVisitor, DEFAULT_MAX_QUESTIONS_PER_VISITOR, 0, MAX_QUESTIONS_PER_VISITOR_LIMIT));
  }
  if (body.rateLimitCount !== undefined) {
    updates.push('rate_limit_count = ?');
    values.push(clampInt(body.rateLimitCount, DEFAULT_RATE_LIMIT_COUNT, 0, MAX_RATE_LIMIT_COUNT));
  }
  if (body.rateLimitWindow !== undefined) {
    updates.push('rate_limit_window = ?');
    values.push(clampInt(body.rateLimitWindow, DEFAULT_RATE_LIMIT_WINDOW, MIN_RATE_LIMIT_WINDOW, MAX_RATE_LIMIT_WINDOW));
  }

  values.push(id);
  await c.env.DB.prepare(
    `UPDATE sessions SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL`
  ).bind(...values).run();

  // 获取更新后的数据
  const row = await c.env.DB.prepare(
    'SELECT * FROM sessions WHERE id = ? AND deleted_at IS NULL'
  ).bind(id).first<SessionRow>();

  // 广播更新事件
  const roomId = c.env.SESSION_ROOM.idFromName(id);
  const room = c.env.SESSION_ROOM.get(roomId);
  await room.fetch(new Request('http://internal/broadcast', {
    method: 'POST',
    body: JSON.stringify({
      type: 'session_updated',
      data: { changes: body },
    }),
  }));

  return c.json<ApiResponse<Session>>({
    success: true,
    data: row ? rowToSession(row) : undefined,
  });
});

// 删除活动
sessionsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const token = c.req.header('X-Admin-Token');

  if (!token) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Admin token required',
    }, 401);
  }

  const isValid = await verifyAdminToken(c.env.DB, id, token);
  if (!isValid) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Invalid admin token',
    }, 403);
  }

  const now = Date.now();
  await c.env.DB.prepare(
    'UPDATE sessions SET deleted_at = ?, updated_at = ? WHERE id = ?'
  ).bind(now, now, id).run();

  // 广播结束事件
  const roomId = c.env.SESSION_ROOM.idFromName(id);
  const room = c.env.SESSION_ROOM.get(roomId);
  await room.fetch(new Request('http://internal/broadcast', {
    method: 'POST',
    body: JSON.stringify({
      type: 'session_ended',
      data: {},
    }),
  }));

  return c.json<ApiResponse<{ deleted: true }>>({
    success: true,
    data: { deleted: true },
  });
});
