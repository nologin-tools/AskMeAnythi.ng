import type {
  Session,
  CreateSessionRequest,
  CreateSessionResponse,
  UpdateSessionRequest,
  Question,
  CreateQuestionRequest,
  ListQuestionsResponse,
  Answer,
  UpsertAnswerRequest,
  CreateReactionRequest,
  ReactionSummary,
  ApiResponse,
} from '@askmeanything/shared';
import { getVisitorId, getAdminToken } from './storage';

const API_BASE = '/api';

// 通用请求函数
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // 添加访客 ID
  const visitorId = getVisitorId();
  if (visitorId) {
    headers['X-Visitor-Id'] = visitorId;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json() as ApiResponse<T>;

  if (!data.success) {
    throw new Error(data.error || 'Request failed');
  }

  return data.data as T;
}

// 添加管理员 Token 的请求函数
async function adminRequest<T>(
  endpoint: string,
  sessionId: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAdminToken(sessionId);
  if (!token) {
    throw new Error('Admin token not found');
  }

  return request<T>(endpoint, {
    ...options,
    headers: {
      ...(options.headers as Record<string, string>),
      'X-Admin-Token': token,
    },
  });
}

// ====== Sessions ======

export async function createSession(data?: CreateSessionRequest): Promise<CreateSessionResponse> {
  return request<CreateSessionResponse>('/sessions', {
    method: 'POST',
    body: JSON.stringify(data || {}),
  });
}

export async function getSession(id: string): Promise<Session> {
  return request<Session>(`/sessions/${id}`);
}

export async function getSessionAdmin(id: string): Promise<Session & { adminToken: string }> {
  return adminRequest<Session & { adminToken: string }>(`/sessions/${id}/admin`, id);
}

export async function updateSession(id: string, data: UpdateSessionRequest): Promise<Session> {
  return adminRequest<Session>(`/sessions/${id}`, id, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteSession(id: string): Promise<{ deleted: true }> {
  return adminRequest<{ deleted: true }>(`/sessions/${id}`, id, {
    method: 'DELETE',
  });
}

// ====== Questions ======

export async function getQuestions(
  sessionId: string,
  params?: {
    status?: string;
    sortBy?: 'votes' | 'time';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  },
  isAdmin?: boolean
): Promise<ListQuestionsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());

  const query = searchParams.toString();
  const endpoint = `/questions/session/${sessionId}${query ? `?${query}` : ''}`;

  if (isAdmin) {
    return adminRequest<ListQuestionsResponse>(endpoint, sessionId);
  }
  return request<ListQuestionsResponse>(endpoint);
}

export async function createQuestion(sessionId: string, data: CreateQuestionRequest): Promise<Question> {
  return request<Question>(`/questions/session/${sessionId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateQuestion(
  id: string,
  sessionId: string,
  data: { status?: string; isPinned?: boolean }
): Promise<{ updated: true }> {
  return adminRequest<{ updated: true }>(`/questions/${id}`, sessionId, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteQuestion(id: string, sessionId: string): Promise<{ deleted: true }> {
  return adminRequest<{ deleted: true }>(`/questions/${id}`, sessionId, {
    method: 'DELETE',
  });
}

// ====== Answers ======

export async function upsertAnswer(questionId: string, sessionId: string, data: UpsertAnswerRequest): Promise<Answer> {
  return adminRequest<Answer>(`/answers/question/${questionId}`, sessionId, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function markAnswered(questionId: string, sessionId: string): Promise<{ marked: true }> {
  return adminRequest<{ marked: true }>(`/answers/question/${questionId}/mark-answered`, sessionId, {
    method: 'POST',
  });
}

export async function deleteAnswer(questionId: string, sessionId: string): Promise<{ deleted: true }> {
  return adminRequest<{ deleted: true }>(`/answers/question/${questionId}`, sessionId, {
    method: 'DELETE',
  });
}

// ====== Votes ======

export async function toggleVote(questionId: string): Promise<{ voted: boolean; voteCount: number }> {
  return request<{ voted: boolean; voteCount: number }>(`/votes/question/${questionId}`, {
    method: 'POST',
  });
}

export async function getVotes(sessionId: string): Promise<{ votes: string[] }> {
  return request<{ votes: string[] }>(`/votes/session/${sessionId}`);
}

// ====== Reactions ======

export async function toggleReaction(data: CreateReactionRequest): Promise<{ added: boolean; reactions: ReactionSummary[] }> {
  return request<{ added: boolean; reactions: ReactionSummary[] }>('/reactions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getReactions(targetType: string, targetId: string): Promise<ReactionSummary[]> {
  return request<ReactionSummary[]>(`/reactions/${targetType}/${targetId}`);
}
