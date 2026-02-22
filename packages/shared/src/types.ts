// Session 状态
export type SessionStatus = 'active' | 'expired' | 'deleted';

// 问题状态
export type QuestionStatus = 'pending' | 'approved' | 'answered' | 'rejected';

// 反应目标类型
export type ReactionTargetType = 'question' | 'answer';

// Session 类型
export interface Session {
  id: string;
  title: string;
  description?: string;
  requireModeration: boolean;
  ttlDays: number;
  maxQuestionsPerVisitor: number;
  rateLimitCount: number;
  rateLimitWindow: number;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
}

// 创建 Session 请求
export interface CreateSessionRequest {
  title?: string;
  description?: string;
  requireModeration?: boolean;
  ttlDays?: number;
  maxQuestionsPerVisitor?: number;
  rateLimitCount?: number;
  rateLimitWindow?: number;
}

// 创建 Session 响应
export interface CreateSessionResponse {
  session: Session;
  adminToken: string;
  adminUrl: string;
  publicUrl: string;
}

// 更新 Session 请求
export interface UpdateSessionRequest {
  title?: string;
  description?: string;
  requireModeration?: boolean;
  ttlDays?: number;
  maxQuestionsPerVisitor?: number;
  rateLimitCount?: number;
  rateLimitWindow?: number;
}

// 问题类型
export interface Question {
  id: string;
  sessionId: string;
  content: string;
  authorId: string;
  authorName?: string;
  status: QuestionStatus;
  isPinned: boolean;
  voteCount: number;
  createdAt: number;
  updatedAt: number;
  // 关联数据
  answer?: Answer;
  reactions?: ReactionSummary[];
  hasVoted?: boolean;
}

// 创建问题请求
export interface CreateQuestionRequest {
  content: string;
  authorName?: string;
}

// 回答类型
export interface Answer {
  id: string;
  questionId: string;
  sessionId: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

// 创建/更新回答请求
export interface UpsertAnswerRequest {
  content: string;
}

// 投票类型
export interface Vote {
  id: string;
  questionId: string;
  voterId: string;
  createdAt: number;
}

// 反应类型
export interface Reaction {
  id: string;
  targetType: ReactionTargetType;
  targetId: string;
  emoji: string;
  reactorId: string;
  createdAt: number;
}

// 反应汇总
export interface ReactionSummary {
  emoji: string;
  count: number;
  hasReacted?: boolean;
}

// 创建反应请求
export interface CreateReactionRequest {
  targetType: ReactionTargetType;
  targetId: string;
  emoji: string;
}

// WebSocket 事件类型
export type WSEventType =
  | 'question_added'
  | 'question_updated'
  | 'vote_changed'
  | 'answer_added'
  | 'answer_updated'
  | 'reaction_changed'
  | 'session_updated'
  | 'session_ended';

// WebSocket 消息 (discriminated union)
export type WSMessage =
  | { type: 'question_added'; data: QuestionAddedData }
  | { type: 'question_updated'; data: QuestionUpdatedData }
  | { type: 'vote_changed'; data: VoteChangedData }
  | { type: 'answer_added'; data: AnswerAddedData }
  | { type: 'answer_updated'; data: AnswerUpdatedData }
  | { type: 'reaction_changed'; data: ReactionChangedData }
  | { type: 'session_updated'; data: SessionUpdatedData }
  | { type: 'session_ended'; data: Record<string, never> };

// 问题添加事件数据
export interface QuestionAddedData {
  question: Question;
}

// 问题更新事件数据
export interface QuestionUpdatedData {
  questionId: string;
  changes: Partial<Question>;
}

// 投票变化事件数据
export interface VoteChangedData {
  questionId: string;
  voteCount: number;
}

// 回答添加事件数据
export interface AnswerAddedData {
  answer: Answer;
}

// 回答更新事件数据
export interface AnswerUpdatedData {
  answerId: string;
  content: string;
  updatedAt: number;
}

// 反应变化事件数据
export interface ReactionChangedData {
  targetType: ReactionTargetType;
  targetId: string;
  reactions: ReactionSummary[];
}

// Session 更新事件数据
export interface SessionUpdatedData {
  changes: Partial<Session>;
}

// API 响应包装
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 分页参数
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

// 问题列表参数
export interface ListQuestionsParams extends PaginationParams {
  status?: QuestionStatus | 'all';
  sortBy?: 'votes' | 'time';
  sortOrder?: 'asc' | 'desc';
}

// 问题列表响应
export interface ListQuestionsResponse {
  questions: Question[];
  total: number;
  hasMore: boolean;
}

// 访客配额信息
export interface VisitorQuotaInfo {
  totalLimit: number;
  totalUsed: number;
  totalRemaining: number;
  rateLimitCount: number;
  rateLimitWindow: number;
  rateUsed: number;
  rateRemaining: number;
  canAsk: boolean;
}
