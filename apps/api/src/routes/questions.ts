import { Hono } from 'hono';
import type { Env, QuestionRow, AnswerRow, SessionRow } from '../types';
import {
  generateUniqueId,
  MAX_QUESTION_LENGTH,
  MAX_AUTHOR_NAME_LENGTH,
  MAX_PAGE_SIZE,
  VALID_QUESTION_STATUSES,
} from '@askmeanything/shared';
import type {
  Question,
  Answer,
  QuestionStatus,
  CreateQuestionRequest,
  ListQuestionsParams,
  ListQuestionsResponse,
  ApiResponse,
  ReactionSummary,
  VisitorQuotaInfo,
} from '@askmeanything/shared';
import { verifyAdminToken } from '../utils/auth';
import { generateFingerprint } from '../utils/fingerprint';

export const questionsRouter = new Hono<{ Bindings: Env }>();

// 转换数据库行到 Question 类型
function rowToQuestion(row: QuestionRow, answer?: AnswerRow | null, reactions?: ReactionSummary[], hasVoted?: boolean): Question {
  return {
    id: row.id,
    sessionId: row.session_id,
    content: row.content,
    authorId: row.author_id,
    authorName: row.author_name ?? undefined,
    status: row.status as QuestionStatus,
    isPinned: row.is_pinned === 1,
    voteCount: row.vote_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    answer: answer ? {
      id: answer.id,
      questionId: answer.question_id,
      sessionId: answer.session_id,
      content: answer.content,
      createdAt: answer.created_at,
      updatedAt: answer.updated_at,
    } : undefined,
    reactions,
    hasVoted,
  };
}

// 获取问题的反应汇总
async function getReactionsSummary(db: D1Database, questionId: string, visitorId?: string): Promise<ReactionSummary[]> {
  const rows = await db.prepare(`
    SELECT emoji, COUNT(*) as count
    FROM reactions
    WHERE target_type = 'question' AND target_id = ?
    GROUP BY emoji
  `).bind(questionId).all<{ emoji: string; count: number }>();

  const reactions = rows.results?.map(r => ({
    emoji: r.emoji,
    count: r.count,
    hasReacted: false,
  })) || [];

  // 检查当前用户是否已反应
  if (visitorId && reactions.length > 0) {
    const userReactions = await db.prepare(`
      SELECT emoji FROM reactions
      WHERE target_type = 'question' AND target_id = ? AND reactor_id = ?
    `).bind(questionId, visitorId).all<{ emoji: string }>();

    const userEmojis = new Set(userReactions.results?.map(r => r.emoji) || []);
    reactions.forEach(r => {
      r.hasReacted = userEmojis.has(r.emoji);
    });
  }

  return reactions;
}

// 批量获取多个问题的反应汇总
async function getBatchReactionsSummary(
  db: D1Database,
  questionIds: string[],
  visitorId?: string
): Promise<Map<string, ReactionSummary[]>> {
  const result = new Map<string, ReactionSummary[]>();
  if (questionIds.length === 0) return result;

  const placeholders = questionIds.map(() => '?').join(',');

  // 批量获取所有反应计数
  const rows = await db.prepare(`
    SELECT target_id, emoji, COUNT(*) as count
    FROM reactions
    WHERE target_type = 'question' AND target_id IN (${placeholders})
    GROUP BY target_id, emoji
  `).bind(...questionIds).all<{ target_id: string; emoji: string; count: number }>();

  // 按 question_id 分组
  const reactionsMap = new Map<string, { emoji: string; count: number; hasReacted: boolean }[]>();
  for (const row of rows.results || []) {
    if (!reactionsMap.has(row.target_id)) {
      reactionsMap.set(row.target_id, []);
    }
    reactionsMap.get(row.target_id)!.push({
      emoji: row.emoji,
      count: row.count,
      hasReacted: false,
    });
  }

  // 批量获取当前用户的反应
  if (visitorId && reactionsMap.size > 0) {
    const userRows = await db.prepare(`
      SELECT target_id, emoji FROM reactions
      WHERE target_type = 'question' AND target_id IN (${placeholders}) AND reactor_id = ?
    `).bind(...questionIds, visitorId).all<{ target_id: string; emoji: string }>();

    const userReactionSet = new Set(
      (userRows.results || []).map(r => `${r.target_id}:${r.emoji}`)
    );

    for (const [targetId, reactions] of reactionsMap) {
      reactions.forEach(r => {
        r.hasReacted = userReactionSet.has(`${targetId}:${r.emoji}`);
      });
    }
  }

  // Fill result for all question IDs
  for (const qid of questionIds) {
    result.set(qid, reactionsMap.get(qid) || []);
  }

  return result;
}

// 检查访客配额 (checks both visitorId and server fingerprint, uses the higher count)
async function checkVisitorQuota(
  db: D1Database,
  sessionId: string,
  visitorId: string,
  session: SessionRow,
  fingerprint?: string
): Promise<VisitorQuotaInfo> {
  const maxTotal = session.max_questions_per_visitor ?? 0;
  const rateCount = session.rate_limit_count ?? 0;
  const rateWindow = session.rate_limit_window ?? 60;
  const windowStart = Date.now() - rateWindow * 1000;

  // Build batch queries for visitorId
  const queries = [
    db.prepare(
      'SELECT COUNT(*) as count FROM questions WHERE session_id = ? AND author_id = ?'
    ).bind(sessionId, visitorId),
    db.prepare(
      'SELECT COUNT(*) as count FROM questions WHERE session_id = ? AND author_id = ? AND created_at > ?'
    ).bind(sessionId, visitorId, windowStart),
  ];

  // Add fingerprint queries if available
  if (fingerprint) {
    queries.push(
      db.prepare(
        'SELECT COUNT(*) as count FROM questions WHERE session_id = ? AND author_fp = ?'
      ).bind(sessionId, fingerprint),
      db.prepare(
        'SELECT COUNT(*) as count FROM questions WHERE session_id = ? AND author_fp = ? AND created_at > ?'
      ).bind(sessionId, fingerprint, windowStart),
    );
  }

  const results = await db.batch(queries);

  const visitorTotal = (results[0].results?.[0] as any)?.count ?? 0;
  const visitorRate = (results[1].results?.[0] as any)?.count ?? 0;

  // Take the maximum count between visitorId and fingerprint
  let totalUsed = visitorTotal;
  let rateUsed = visitorRate;

  if (fingerprint && results.length >= 4) {
    const fpTotal = (results[2].results?.[0] as any)?.count ?? 0;
    const fpRate = (results[3].results?.[0] as any)?.count ?? 0;
    totalUsed = Math.max(visitorTotal, fpTotal);
    rateUsed = Math.max(visitorRate, fpRate);
  }

  const totalRemaining = maxTotal > 0 ? Math.max(0, maxTotal - totalUsed) : -1;
  const rateRemaining = rateCount > 0 ? Math.max(0, rateCount - rateUsed) : -1;

  const canAsk =
    (maxTotal === 0 || totalUsed < maxTotal) &&
    (rateCount === 0 || rateUsed < rateCount);

  return {
    totalLimit: maxTotal,
    totalUsed,
    totalRemaining: totalRemaining === -1 ? -1 : totalRemaining,
    rateLimitCount: rateCount,
    rateLimitWindow: rateWindow,
    rateUsed,
    rateRemaining: rateRemaining === -1 ? -1 : rateRemaining,
    canAsk,
  };
}

// 获取问题列表
questionsRouter.get('/session/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  const visitorId = c.req.header('X-Visitor-Id');
  const adminToken = c.req.header('X-Admin-Token');
  const isAdmin = adminToken && await verifyAdminToken(c.env.DB, sessionId, adminToken);

  // 查询参数
  const status = c.req.query('status') || 'all';
  const sortBy = c.req.query('sortBy') || 'votes';
  const sortOrder = c.req.query('sortOrder') || 'desc';
  const limit = Math.max(1, Math.min(parseInt(c.req.query('limit') || '50', 10), MAX_PAGE_SIZE));
  const offset = Math.max(0, parseInt(c.req.query('offset') || '0', 10));

  // 构建查询
  let whereClause = 'session_id = ?';
  const params: (string | number)[] = [sessionId];

  // 非管理员只能看到已通过的问题
  if (!isAdmin) {
    if (status === 'all') {
      whereClause += " AND status IN ('approved', 'answered')";
    } else if (status === 'answered') {
      whereClause += " AND status = 'answered'";
    } else {
      whereClause += " AND status = 'approved'";
    }
  } else {
    if (status !== 'all') {
      whereClause += ' AND status = ?';
      params.push(status);
    }
  }

  // 排序
  let orderClause = 'is_pinned DESC, ';
  if (sortBy === 'votes') {
    orderClause += sortOrder === 'asc' ? 'vote_count ASC' : 'vote_count DESC';
  } else {
    orderClause += sortOrder === 'asc' ? 'created_at ASC' : 'created_at DESC';
  }

  // 总数
  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM questions WHERE ${whereClause}`
  ).bind(...params).first<{ total: number }>();
  const total = countResult?.total || 0;

  // 分页
  params.push(limit, offset);
  const rows = await c.env.DB.prepare(`
    SELECT * FROM questions
    WHERE ${whereClause}
    ORDER BY ${orderClause}
    LIMIT ? OFFSET ?
  `).bind(...params).all<QuestionRow>();

  // 获取关联的回答
  const questionIds = rows.results?.map(q => q.id) || [];
  const answers: Map<string, AnswerRow> = new Map();
  if (questionIds.length > 0) {
    const placeholders = questionIds.map(() => '?').join(',');
    const answerRows = await c.env.DB.prepare(`
      SELECT * FROM answers WHERE question_id IN (${placeholders})
    `).bind(...questionIds).all<AnswerRow>();
    answerRows.results?.forEach(a => answers.set(a.question_id, a));
  }

  // 获取用户的投票状态
  const userVotes: Set<string> = new Set();
  if (visitorId && questionIds.length > 0) {
    const placeholders = questionIds.map(() => '?').join(',');
    const voteRows = await c.env.DB.prepare(`
      SELECT question_id FROM votes WHERE voter_id = ? AND question_id IN (${placeholders})
    `).bind(visitorId, ...questionIds).all<{ question_id: string }>();
    voteRows.results?.forEach(v => userVotes.add(v.question_id));
  }

  // 批量获取反应
  const reactionsMap = await getBatchReactionsSummary(c.env.DB, questionIds, visitorId);

  // 构建问题列表
  const questions: Question[] = (rows.results || []).map(row =>
    rowToQuestion(
      row,
      answers.get(row.id),
      reactionsMap.get(row.id) || [],
      userVotes.has(row.id)
    )
  );

  return c.json<ApiResponse<ListQuestionsResponse>>({
    success: true,
    data: {
      questions,
      total,
      hasMore: offset + questions.length < total,
    },
  });
});

// 创建问题
questionsRouter.post('/session/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  const visitorId = c.req.header('X-Visitor-Id');

  if (!visitorId) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Visitor ID required',
    }, 400);
  }

  const body = await c.req.json<CreateQuestionRequest>().catch((): CreateQuestionRequest => ({} as CreateQuestionRequest));

  // Validate content
  if (!body.content?.trim()) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Question content is required',
    }, 400);
  }

  if (body.content.length > MAX_QUESTION_LENGTH) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: `Question content must not exceed ${MAX_QUESTION_LENGTH} characters`,
    }, 400);
  }

  if (body.authorName && body.authorName.length > MAX_AUTHOR_NAME_LENGTH) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: `Author name must not exceed ${MAX_AUTHOR_NAME_LENGTH} characters`,
    }, 400);
  }

  // 验证 session 存在且未过期
  const session = await c.env.DB.prepare(
    'SELECT * FROM sessions WHERE id = ? AND deleted_at IS NULL'
  ).bind(sessionId).first<SessionRow>();

  if (!session) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Session not found',
    }, 404);
  }

  if (session.expires_at < Date.now()) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Session expired',
    }, 410);
  }

  // Generate server-side fingerprint
  const fingerprint = await generateFingerprint(c);

  // Check visitor quota (uses both visitorId and fingerprint)
  const quota = await checkVisitorQuota(c.env.DB, sessionId, visitorId, session, fingerprint);
  if (!quota.canAsk) {
    if (quota.totalLimit > 0 && quota.totalUsed >= quota.totalLimit) {
      return c.json<ApiResponse<{ quota: VisitorQuotaInfo }>>({
        success: false,
        error: `You have reached the maximum of ${quota.totalLimit} questions for this session`,
        data: { quota },
      }, 403);
    }
    return c.json<ApiResponse<{ quota: VisitorQuotaInfo }>>({
      success: false,
      error: `Rate limit exceeded. Please wait before asking another question`,
      data: { quota },
    }, 429);
  }

  const id = generateUniqueId();
  const now = Date.now();
  // 如果需要预审核，状态为 pending；否则为 approved
  const status = session.require_moderation ? 'pending' : 'approved';

  // Use visitorId from header as authorId (prevents spoofing)
  await c.env.DB.prepare(`
    INSERT INTO questions (id, session_id, content, author_id, author_name, author_fp, status, is_pinned, vote_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
  `).bind(
    id,
    sessionId,
    body.content,
    visitorId,
    body.authorName || null,
    fingerprint,
    status,
    now,
    now
  ).run();

  const question: Question = {
    id,
    sessionId,
    content: body.content,
    authorId: visitorId,
    authorName: body.authorName,
    status: status as QuestionStatus,
    isPinned: false,
    voteCount: 0,
    createdAt: now,
    updatedAt: now,
    reactions: [],
    hasVoted: false,
  };

  // 如果不需要审核，广播新问题
  if (status === 'approved') {
    const roomId = c.env.SESSION_ROOM.idFromName(sessionId);
    const room = c.env.SESSION_ROOM.get(roomId);
    await room.fetch(new Request('http://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        type: 'question_added',
        data: { question },
      }),
    }));
  }

  return c.json<ApiResponse<Question>>({
    success: true,
    data: question,
  }, 201);
});

// 更新问题状态（管理员）
questionsRouter.patch('/:id', async (c) => {
  const questionId = c.req.param('id');
  const adminToken = c.req.header('X-Admin-Token');

  // 获取问题所属的 session
  const question = await c.env.DB.prepare(
    'SELECT * FROM questions WHERE id = ?'
  ).bind(questionId).first<QuestionRow>();

  if (!question) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Question not found',
    }, 404);
  }

  // 验证管理员权限
  if (!adminToken || !await verifyAdminToken(c.env.DB, question.session_id, adminToken)) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Unauthorized',
    }, 403);
  }

  const body = await c.req.json<{ status?: QuestionStatus; isPinned?: boolean }>().catch((): { status?: QuestionStatus; isPinned?: boolean } => ({}));

  const now = Date.now();
  const updates: string[] = ['updated_at = ?'];
  const values: (string | number)[] = [now];

  if (body.status !== undefined) {
    // Validate status is a valid QuestionStatus
    if (!(VALID_QUESTION_STATUSES as readonly string[]).includes(body.status)) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: `Invalid status. Must be one of: ${VALID_QUESTION_STATUSES.join(', ')}`,
      }, 400);
    }
    updates.push('status = ?');
    values.push(body.status);
  }
  if (body.isPinned !== undefined) {
    updates.push('is_pinned = ?');
    values.push(body.isPinned ? 1 : 0);
  }

  values.push(questionId);
  await c.env.DB.prepare(
    `UPDATE questions SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...values).run();

  // 广播更新
  const roomId = c.env.SESSION_ROOM.idFromName(question.session_id);
  const room = c.env.SESSION_ROOM.get(roomId);

  // 如果是从 pending 变为 approved，广播新问题
  if (body.status === 'approved' && question.status === 'pending') {
    const updatedRow = await c.env.DB.prepare('SELECT * FROM questions WHERE id = ?').bind(questionId).first<QuestionRow>();
    if (updatedRow) {
      await room.fetch(new Request('http://internal/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          type: 'question_added',
          data: { question: rowToQuestion(updatedRow) },
        }),
      }));
    }
  } else {
    await room.fetch(new Request('http://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        type: 'question_updated',
        data: {
          questionId,
          changes: body,
        },
      }),
    }));
  }

  return c.json<ApiResponse<{ updated: true }>>({
    success: true,
    data: { updated: true },
  });
});

// 获取访客配额
questionsRouter.get('/session/:sessionId/quota', async (c) => {
  const sessionId = c.req.param('sessionId');
  const visitorId = c.req.header('X-Visitor-Id');

  if (!visitorId) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Visitor ID required',
    }, 400);
  }

  const session = await c.env.DB.prepare(
    'SELECT * FROM sessions WHERE id = ? AND deleted_at IS NULL'
  ).bind(sessionId).first<SessionRow>();

  if (!session) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Session not found',
    }, 404);
  }

  const fp = await generateFingerprint(c);
  const quota = await checkVisitorQuota(c.env.DB, sessionId, visitorId, session, fp);

  return c.json<ApiResponse<VisitorQuotaInfo>>({
    success: true,
    data: quota,
  });
});

// 删除问题（管理员）
questionsRouter.delete('/:id', async (c) => {
  const questionId = c.req.param('id');
  const adminToken = c.req.header('X-Admin-Token');

  // 获取问题
  const question = await c.env.DB.prepare(
    'SELECT session_id FROM questions WHERE id = ?'
  ).bind(questionId).first<{ session_id: string }>();

  if (!question) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Question not found',
    }, 404);
  }

  // 验证管理员权限
  if (!adminToken || !await verifyAdminToken(c.env.DB, question.session_id, adminToken)) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Unauthorized',
    }, 403);
  }

  await c.env.DB.prepare('DELETE FROM questions WHERE id = ?').bind(questionId).run();

  // 广播删除
  const roomId = c.env.SESSION_ROOM.idFromName(question.session_id);
  const room = c.env.SESSION_ROOM.get(roomId);
  await room.fetch(new Request('http://internal/broadcast', {
    method: 'POST',
    body: JSON.stringify({
      type: 'question_updated',
      data: {
        questionId,
        changes: { deleted: true },
      },
    }),
  }));

  return c.json<ApiResponse<{ deleted: true }>>({
    success: true,
    data: { deleted: true },
  });
});
