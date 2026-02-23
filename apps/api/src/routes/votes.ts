import { Hono } from 'hono';
import type { Env, QuestionRow, VoteRow } from '../types';
import { generateUniqueId } from '@askmeanything/shared';
import type { ApiResponse } from '@askmeanything/shared';
import { checkRateLimit } from '../middleware/rate-limit';

export const votesRouter = new Hono<{ Bindings: Env }>();

// 投票/取消投票
votesRouter.post('/question/:questionId', async (c) => {
  // Vote rate limit: 30 per minute per IP
  const { limited } = await checkRateLimit(c, { prefix: 'vote', maxRequests: 30, windowSeconds: 60 });
  if (limited) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Too many votes. Please slow down.' }, 429);
  }

  const questionId = c.req.param('questionId');
  const visitorId = c.req.header('X-Visitor-Id');

  if (!visitorId) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Visitor ID required',
    }, 400);
  }

  // 获取问题
  const question = await c.env.DB.prepare(
    'SELECT * FROM questions WHERE id = ?'
  ).bind(questionId).first<QuestionRow>();

  if (!question) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Question not found',
    }, 404);
  }

  // 检查是否已投票
  const existingVote = await c.env.DB.prepare(
    'SELECT * FROM votes WHERE question_id = ? AND voter_id = ?'
  ).bind(questionId, visitorId).first<VoteRow>();

  const now = Date.now();
  let newVoteCount: number;
  let voted: boolean;

  if (existingVote) {
    // 取消投票 - use batch for atomicity
    await c.env.DB.batch([
      c.env.DB.prepare(
        'DELETE FROM votes WHERE question_id = ? AND voter_id = ?'
      ).bind(questionId, visitorId),
      c.env.DB.prepare(
        'UPDATE questions SET vote_count = vote_count - 1, updated_at = ? WHERE id = ?'
      ).bind(now, questionId),
    ]);

    newVoteCount = question.vote_count - 1;
    voted = false;
  } else {
    // 添加投票 - use batch for atomicity
    const voteId = generateUniqueId();
    await c.env.DB.batch([
      c.env.DB.prepare(
        'INSERT INTO votes (id, question_id, voter_id, created_at) VALUES (?, ?, ?, ?)'
      ).bind(voteId, questionId, visitorId, now),
      c.env.DB.prepare(
        'UPDATE questions SET vote_count = vote_count + 1, updated_at = ? WHERE id = ?'
      ).bind(now, questionId),
    ]);

    newVoteCount = question.vote_count + 1;
    voted = true;
  }

  // 广播投票变化
  const roomId = c.env.SESSION_ROOM.idFromName(question.session_id);
  const room = c.env.SESSION_ROOM.get(roomId);
  await room.fetch(new Request('http://internal/broadcast', {
    method: 'POST',
    body: JSON.stringify({
      type: 'vote_changed',
      data: {
        questionId,
        voteCount: newVoteCount,
      },
    }),
  }));

  return c.json<ApiResponse<{ voted: boolean; voteCount: number }>>({
    success: true,
    data: { voted, voteCount: newVoteCount },
  });
});

// 获取用户的投票状态
votesRouter.get('/session/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  const visitorId = c.req.header('X-Visitor-Id');

  if (!visitorId) {
    return c.json<ApiResponse<{ votes: string[] }>>({
      success: true,
      data: { votes: [] },
    });
  }

  const rows = await c.env.DB.prepare(`
    SELECT v.question_id FROM votes v
    JOIN questions q ON v.question_id = q.id
    WHERE q.session_id = ? AND v.voter_id = ?
  `).bind(sessionId, visitorId).all<{ question_id: string }>();

  return c.json<ApiResponse<{ votes: string[] }>>({
    success: true,
    data: {
      votes: rows.results?.map(r => r.question_id) || [],
    },
  });
});
