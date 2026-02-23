import { Hono } from 'hono';
import type { Env, ReactionRow } from '../types';
import { generateUniqueId, MAX_EMOJI_LENGTH } from '@askmeanything/shared';
import type {
  CreateReactionRequest,
  ReactionSummary,
  ApiResponse,
} from '@askmeanything/shared';
import { checkRateLimit } from '../middleware/rate-limit';

export const reactionsRouter = new Hono<{ Bindings: Env }>();

// 获取反应汇总
async function getReactionsSummary(
  db: D1Database,
  targetType: string,
  targetId: string,
  reactorId?: string
): Promise<ReactionSummary[]> {
  const rows = await db.prepare(`
    SELECT emoji, COUNT(*) as count
    FROM reactions
    WHERE target_type = ? AND target_id = ?
    GROUP BY emoji
  `).bind(targetType, targetId).all<{ emoji: string; count: number }>();

  const reactions = rows.results?.map(r => ({
    emoji: r.emoji,
    count: r.count,
    hasReacted: false,
  })) || [];

  if (reactorId && reactions.length > 0) {
    const userReactions = await db.prepare(`
      SELECT emoji FROM reactions
      WHERE target_type = ? AND target_id = ? AND reactor_id = ?
    `).bind(targetType, targetId, reactorId).all<{ emoji: string }>();

    const userEmojis = new Set(userReactions.results?.map(r => r.emoji) || []);
    reactions.forEach(r => {
      r.hasReacted = userEmojis.has(r.emoji);
    });
  }

  return reactions;
}

// 获取目标的 session_id
async function getSessionId(
  db: D1Database,
  targetType: string,
  targetId: string
): Promise<string | null> {
  if (targetType === 'question') {
    const question = await db.prepare(
      'SELECT session_id FROM questions WHERE id = ?'
    ).bind(targetId).first<{ session_id: string }>();
    return question?.session_id || null;
  } else {
    const answer = await db.prepare(
      'SELECT session_id FROM answers WHERE id = ?'
    ).bind(targetId).first<{ session_id: string }>();
    return answer?.session_id || null;
  }
}

const VALID_TARGET_TYPES = ['question', 'answer'];

// 添加/移除反应
reactionsRouter.post('/', async (c) => {
  // Reaction rate limit: 30 per minute per IP
  const { limited } = await checkRateLimit(c, { prefix: 'reaction', maxRequests: 30, windowSeconds: 60 });
  if (limited) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Too many reactions. Please slow down.' }, 429);
  }

  const body = await c.req.json<CreateReactionRequest>().catch((): CreateReactionRequest => ({} as CreateReactionRequest));
  const visitorId = c.req.header('X-Visitor-Id');

  if (!visitorId) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Visitor ID required',
    }, 400);
  }

  const { targetType, targetId, emoji } = body;

  // Validate targetType
  if (!VALID_TARGET_TYPES.includes(targetType)) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Invalid target type. Must be "question" or "answer"',
    }, 400);
  }

  // Validate emoji
  if (!emoji || emoji.length > MAX_EMOJI_LENGTH) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Invalid emoji',
    }, 400);
  }

  // 获取 session_id
  const sessionId = await getSessionId(c.env.DB, targetType, targetId);
  if (!sessionId) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Target not found',
    }, 404);
  }

  const now = Date.now();

  // 检查是否已存在反应
  const existing = await c.env.DB.prepare(`
    SELECT * FROM reactions
    WHERE target_type = ? AND target_id = ? AND emoji = ? AND reactor_id = ?
  `).bind(targetType, targetId, emoji, visitorId).first<ReactionRow>();

  if (existing) {
    // 移除反应
    await c.env.DB.prepare(`
      DELETE FROM reactions
      WHERE target_type = ? AND target_id = ? AND emoji = ? AND reactor_id = ?
    `).bind(targetType, targetId, emoji, visitorId).run();
  } else {
    // 添加反应
    const reactionId = generateUniqueId();
    await c.env.DB.prepare(`
      INSERT INTO reactions (id, target_type, target_id, emoji, reactor_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(reactionId, targetType, targetId, emoji, visitorId, now).run();
  }

  // 获取更新后的反应汇总
  const reactions = await getReactionsSummary(c.env.DB, targetType, targetId, visitorId);

  // 广播反应变化
  const roomId = c.env.SESSION_ROOM.idFromName(sessionId);
  const room = c.env.SESSION_ROOM.get(roomId);
  await room.fetch(new Request('http://internal/broadcast', {
    method: 'POST',
    body: JSON.stringify({
      type: 'reaction_changed',
      data: {
        targetType,
        targetId,
        reactions,
      },
    }),
  }));

  return c.json<ApiResponse<{ added: boolean; reactions: ReactionSummary[] }>>({
    success: true,
    data: { added: !existing, reactions },
  });
});

// 获取目标的所有反应
reactionsRouter.get('/:targetType/:targetId', async (c) => {
  const targetType = c.req.param('targetType');
  const targetId = c.req.param('targetId');
  const visitorId = c.req.header('X-Visitor-Id');

  // Validate targetType
  if (!VALID_TARGET_TYPES.includes(targetType)) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Invalid target type. Must be "question" or "answer"',
    }, 400);
  }

  const reactions = await getReactionsSummary(c.env.DB, targetType, targetId, visitorId);

  return c.json<ApiResponse<ReactionSummary[]>>({
    success: true,
    data: reactions,
  });
});
