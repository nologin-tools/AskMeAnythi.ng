import { Hono } from 'hono';
import type { Env, ReportRow } from '../types';
import {
  generateUniqueId,
  VALID_REPORT_REASONS,
  AUTO_HIDE_REPORT_THRESHOLD,
  MAX_REPORT_DESCRIPTION_LENGTH,
} from '@askmeanything/shared';
import type {
  Report,
  CreateReportRequest,
  ReportStatus,
  ApiResponse,
} from '@askmeanything/shared';
import { verifyAdminToken } from '../utils/auth';
import { checkRateLimit } from '../middleware/rate-limit';

export const reportsRouter = new Hono<{ Bindings: Env }>();

function rowToReport(row: ReportRow): Report {
  return {
    id: row.id,
    targetType: row.target_type as Report['targetType'],
    targetId: row.target_id,
    sessionId: row.session_id,
    reporterId: row.reporter_id,
    reason: row.reason as Report['reason'],
    description: row.description ?? undefined,
    status: row.status as ReportStatus,
    createdAt: row.created_at,
  };
}

// Submit a report (visitor)
reportsRouter.post('/', async (c) => {
  // Rate limit: 10 reports per hour per IP
  const { limited } = await checkRateLimit(c, { prefix: 'report', maxRequests: 10, windowSeconds: 3600 });
  if (limited) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Too many reports. Please try again later.' }, 429);
  }

  const visitorId = c.req.header('X-Visitor-Id');
  if (!visitorId) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Visitor ID required' }, 400);
  }

  const body = await c.req.json<CreateReportRequest>().catch((): CreateReportRequest => ({} as CreateReportRequest));

  // Validate target type
  if (!body.targetType || !['question', 'answer'].includes(body.targetType)) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Invalid target type' }, 400);
  }

  // Validate reason
  if (!body.reason || !(VALID_REPORT_REASONS as readonly string[]).includes(body.reason)) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: `Invalid reason. Must be one of: ${VALID_REPORT_REASONS.join(', ')}`,
    }, 400);
  }

  // Validate description length
  if (body.description && body.description.length > MAX_REPORT_DESCRIPTION_LENGTH) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: `Description must not exceed ${MAX_REPORT_DESCRIPTION_LENGTH} characters`,
    }, 400);
  }

  if (!body.targetId || !body.sessionId) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Target ID and session ID are required' }, 400);
  }

  const id = generateUniqueId();
  const now = Date.now();

  try {
    await c.env.DB.prepare(`
      INSERT INTO reports (id, target_type, target_id, session_id, reporter_id, reason, description, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).bind(
      id,
      body.targetType,
      body.targetId,
      body.sessionId,
      visitorId,
      body.reason,
      body.description || null,
      now
    ).run();
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return c.json<ApiResponse<null>>({ success: false, error: 'You have already reported this content' }, 409);
    }
    throw err;
  }

  // Check if report count exceeds threshold — auto-hide question
  if (body.targetType === 'question') {
    const countResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM reports WHERE target_type = ? AND target_id = ? AND status = ?'
    ).bind('question', body.targetId, 'pending').first<{ count: number }>();

    if (countResult && countResult.count >= AUTO_HIDE_REPORT_THRESHOLD) {
      // Set question status to pending (needs re-moderation)
      await c.env.DB.prepare(
        "UPDATE questions SET status = 'pending', updated_at = ? WHERE id = ? AND status != 'pending'"
      ).bind(now, body.targetId).run();
    }
  }

  return c.json<ApiResponse<Report>>({
    success: true,
    data: {
      id,
      targetType: body.targetType,
      targetId: body.targetId,
      sessionId: body.sessionId,
      reporterId: visitorId,
      reason: body.reason,
      description: body.description,
      status: 'pending',
      createdAt: now,
    },
  }, 201);
});

// Get reports for a session (admin)
reportsRouter.get('/session/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  const adminToken = c.req.header('X-Admin-Token');

  if (!adminToken) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Admin token required' }, 401);
  }

  const isValid = await verifyAdminToken(c.env.DB, sessionId, adminToken);
  if (!isValid) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Invalid admin token' }, 403);
  }

  const status = c.req.query('status') || 'pending';

  const rows = await c.env.DB.prepare(
    'SELECT * FROM reports WHERE session_id = ? AND status = ? ORDER BY created_at DESC'
  ).bind(sessionId, status).all<ReportRow>();

  return c.json<ApiResponse<Report[]>>({
    success: true,
    data: (rows.results || []).map(rowToReport),
  });
});

// Update report status (admin)
reportsRouter.patch('/:id', async (c) => {
  const reportId = c.req.param('id');
  const adminToken = c.req.header('X-Admin-Token');

  const report = await c.env.DB.prepare(
    'SELECT * FROM reports WHERE id = ?'
  ).bind(reportId).first<ReportRow>();

  if (!report) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Report not found' }, 404);
  }

  if (!adminToken || !await verifyAdminToken(c.env.DB, report.session_id, adminToken)) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Unauthorized' }, 403);
  }

  const body = await c.req.json<{ status: ReportStatus }>().catch(() => ({ status: '' as ReportStatus }));

  if (!['reviewed', 'dismissed'].includes(body.status)) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Status must be "reviewed" or "dismissed"' }, 400);
  }

  await c.env.DB.prepare(
    'UPDATE reports SET status = ? WHERE id = ?'
  ).bind(body.status, reportId).run();

  return c.json<ApiResponse<{ updated: true }>>({
    success: true,
    data: { updated: true },
  });
});
