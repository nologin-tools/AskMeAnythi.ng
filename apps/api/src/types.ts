import type { D1Database, DurableObjectNamespace, KVNamespace } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  SESSION_ROOM: DurableObjectNamespace;
  CACHE: KVNamespace;
  ENVIRONMENT: string;
  TURNSTILE_SECRET_KEY?: string;
  // RESEND_API_KEY: string;
}

// 数据库行类型
export interface SessionRow {
  id: string;
  admin_token: string;
  title: string;
  description: string | null;
  require_moderation: number;
  ttl_days: number;
  max_questions_per_visitor: number;
  rate_limit_count: number;
  rate_limit_window: number;
  expires_at: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export interface QuestionRow {
  id: string;
  session_id: string;
  content: string;
  author_id: string;
  author_name: string | null;
  author_fp: string | null;
  status: string;
  is_pinned: number;
  vote_count: number;
  created_at: number;
  updated_at: number;
}

export interface AnswerRow {
  id: string;
  question_id: string;
  session_id: string;
  content: string;
  created_at: number;
  updated_at: number;
}

export interface VoteRow {
  id: string;
  question_id: string;
  voter_id: string;
  created_at: number;
}

export interface ReportRow {
  id: string;
  target_type: string;
  target_id: string;
  session_id: string;
  reporter_id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: number;
}

export interface ReactionRow {
  id: string;
  target_type: string;
  target_id: string;
  emoji: string;
  reactor_id: string;
  created_at: number;
}
