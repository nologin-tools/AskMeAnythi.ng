import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env, SessionRow } from './types';
import { sessionsRouter } from './routes/sessions';
import { questionsRouter } from './routes/questions';
import { answersRouter } from './routes/answers';
import { votesRouter } from './routes/votes';
import { reactionsRouter } from './routes/reactions';
import { handleScheduled } from './scheduled';

// Re-export Durable Object
export { SessionRoom } from './durable-objects/session-room';

const app = new Hono<{ Bindings: Env }>();

// 中间件
app.use('*', logger());
app.use('*', async (c, next) => {
  const isProd = c.env.ENVIRONMENT === 'production';
  const origins = isProd
    ? ['https://askmeanythi.ng']
    : ['http://localhost:5173', 'http://localhost:3000', 'https://askmeanythi.ng'];

  const corsMiddleware = cors({
    origin: origins,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Admin-Token', 'X-Visitor-Id'],
    credentials: true,
  });

  return corsMiddleware(c, next);
});

// 健康检查
app.get('/health', (c) => c.json({ status: 'ok' }));

// API 路由
app.route('/api/sessions', sessionsRouter);
app.route('/api/questions', questionsRouter);
app.route('/api/answers', answersRouter);
app.route('/api/votes', votesRouter);
app.route('/api/reactions', reactionsRouter);

// WebSocket 升级路由
app.get('/ws/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');

  // Validate session exists and is not expired
  const session = await c.env.DB.prepare(
    'SELECT id, expires_at FROM sessions WHERE id = ? AND deleted_at IS NULL'
  ).bind(sessionId).first<Pick<SessionRow, 'id' | 'expires_at'>>();

  if (!session || session.expires_at < Date.now()) {
    return c.json({ success: false, error: 'Session not found or expired' }, 404);
  }

  const id = c.env.SESSION_ROOM.idFromName(sessionId);
  const stub = c.env.SESSION_ROOM.get(id);

  // 转发请求到 Durable Object
  return stub.fetch(c.req.raw);
});

// 404 处理
app.notFound((c) => c.json({ success: false, error: 'Not Found' }, 404));

// 错误处理
app.onError((err, c) => {
  console.error('Error:', err);
  const isProd = c.env.ENVIRONMENT === 'production';
  return c.json({
    success: false,
    error: isProd ? 'Internal Server Error' : err.message || 'Internal Server Error',
  }, 500);
});

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleScheduled(env));
  },
};
