import { Hono } from 'hono';
import type { Env, QuestionRow, AnswerRow } from '../types';
import { generateUniqueId, MAX_ANSWER_LENGTH } from '@askmeanything/shared';
import type { Answer, UpsertAnswerRequest, ApiResponse } from '@askmeanything/shared';
import { verifyAdminToken } from '../utils/auth';

export const answersRouter = new Hono<{ Bindings: Env }>();

// 创建或更新回答
answersRouter.put('/question/:questionId', async (c) => {
  const questionId = c.req.param('questionId');
  const adminToken = c.req.header('X-Admin-Token');
  const body = await c.req.json<UpsertAnswerRequest>().catch((): UpsertAnswerRequest => ({} as UpsertAnswerRequest));

  // Validate content
  if (!body.content?.trim()) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Answer content is required',
    }, 400);
  }

  if (body.content.length > MAX_ANSWER_LENGTH) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: `Answer content must not exceed ${MAX_ANSWER_LENGTH} characters`,
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

  // 验证管理员权限
  if (!adminToken || !await verifyAdminToken(c.env.DB, question.session_id, adminToken)) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Unauthorized',
    }, 403);
  }

  const now = Date.now();

  // 检查是否已有回答
  const existingAnswer = await c.env.DB.prepare(
    'SELECT * FROM answers WHERE question_id = ?'
  ).bind(questionId).first<AnswerRow>();

  let answer: Answer;

  if (existingAnswer) {
    // 更新回答
    await c.env.DB.prepare(`
      UPDATE answers SET content = ?, updated_at = ? WHERE question_id = ?
    `).bind(body.content, now, questionId).run();

    answer = {
      id: existingAnswer.id,
      questionId,
      sessionId: question.session_id,
      content: body.content,
      createdAt: existingAnswer.created_at,
      updatedAt: now,
    };

    // 广播更新
    const roomId = c.env.SESSION_ROOM.idFromName(question.session_id);
    const room = c.env.SESSION_ROOM.get(roomId);
    await room.fetch(new Request('http://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        type: 'answer_updated',
        data: {
          answerId: answer.id,
          content: body.content,
          updatedAt: now,
        },
      }),
    }));
  } else {
    // 创建回答 - use batch for atomicity (insert answer + update question status)
    const id = generateUniqueId();
    await c.env.DB.batch([
      c.env.DB.prepare(`
        INSERT INTO answers (id, question_id, session_id, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(id, questionId, question.session_id, body.content, now, now),
      c.env.DB.prepare(`
        UPDATE questions SET status = 'answered', updated_at = ? WHERE id = ?
      `).bind(now, questionId),
    ]);

    answer = {
      id,
      questionId,
      sessionId: question.session_id,
      content: body.content,
      createdAt: now,
      updatedAt: now,
    };

    // 广播新回答
    const roomId = c.env.SESSION_ROOM.idFromName(question.session_id);
    const room = c.env.SESSION_ROOM.get(roomId);
    await room.fetch(new Request('http://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        type: 'answer_added',
        data: { answer },
      }),
    }));
  }

  return c.json<ApiResponse<Answer>>({
    success: true,
    data: answer,
  });
});

// 标记为已回答（无文字回答）
answersRouter.post('/question/:questionId/mark-answered', async (c) => {
  const questionId = c.req.param('questionId');
  const adminToken = c.req.header('X-Admin-Token');

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

  // 验证管理员权限
  if (!adminToken || !await verifyAdminToken(c.env.DB, question.session_id, adminToken)) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Unauthorized',
    }, 403);
  }

  const now = Date.now();

  // 更新问题状态
  await c.env.DB.prepare(`
    UPDATE questions SET status = 'answered', updated_at = ? WHERE id = ?
  `).bind(now, questionId).run();

  // 广播状态更新
  const roomId = c.env.SESSION_ROOM.idFromName(question.session_id);
  const room = c.env.SESSION_ROOM.get(roomId);
  await room.fetch(new Request('http://internal/broadcast', {
    method: 'POST',
    body: JSON.stringify({
      type: 'question_updated',
      data: {
        questionId,
        changes: { status: 'answered' },
      },
    }),
  }));

  return c.json<ApiResponse<{ marked: true }>>({
    success: true,
    data: { marked: true },
  });
});

// 删除回答
answersRouter.delete('/question/:questionId', async (c) => {
  const questionId = c.req.param('questionId');
  const adminToken = c.req.header('X-Admin-Token');

  // 获取回答
  const answer = await c.env.DB.prepare(
    'SELECT * FROM answers WHERE question_id = ?'
  ).bind(questionId).first<AnswerRow>();

  if (!answer) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Answer not found',
    }, 404);
  }

  // 验证管理员权限
  if (!adminToken || !await verifyAdminToken(c.env.DB, answer.session_id, adminToken)) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Unauthorized',
    }, 403);
  }

  const now = Date.now();

  // 删除回答 + 更新问题状态 - use batch for atomicity
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM answers WHERE question_id = ?').bind(questionId),
    c.env.DB.prepare(`
      UPDATE questions SET status = 'approved', updated_at = ? WHERE id = ?
    `).bind(now, questionId),
  ]);

  // 广播删除
  const roomId = c.env.SESSION_ROOM.idFromName(answer.session_id);
  const room = c.env.SESSION_ROOM.get(roomId);
  await room.fetch(new Request('http://internal/broadcast', {
    method: 'POST',
    body: JSON.stringify({
      type: 'question_updated',
      data: {
        questionId,
        changes: { status: 'approved', answer: null },
      },
    }),
  }));

  return c.json<ApiResponse<{ deleted: true }>>({
    success: true,
    data: { deleted: true },
  });
});
