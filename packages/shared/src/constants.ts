// Base58 字符集（去掉 0, O, I, l, 1）
export const BASE58_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// Session ID 长度
export const SESSION_ID_LENGTH = 5;

// Admin Token 长度
export const ADMIN_TOKEN_LENGTH = 32;

// 默认 TTL（天）
export const DEFAULT_TTL_DAYS = 1;

// 最小 TTL（天）
export const MIN_TTL_DAYS = 1;

// 最大 TTL（天）
export const MAX_TTL_DAYS = 7;

// TTL 选项
export const TTL_OPTIONS = [1, 2, 3, 7] as const;

// Validation limits
export const MAX_QUESTION_LENGTH = 2000;
export const MAX_ANSWER_LENGTH = 10000;
export const MAX_TITLE_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 1000;
export const MAX_AUTHOR_NAME_LENGTH = 50;
export const MAX_EMOJI_LENGTH = 10;

// Pagination
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

// 默认标题
export const DEFAULT_TITLE = 'Untitled Session';

// 合法的问题状态
export const VALID_QUESTION_STATUSES = ['pending', 'approved', 'answered', 'rejected'] as const;

// Admin Token 格式：URL-safe Base64 字符集
export const ADMIN_TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,64}$/;

// 快捷反应 Emoji
export const QUICK_REACTIONS = ['👍', '👎', '➕', '➖'] as const;

// 常用 Emoji
export const COMMON_EMOJIS = ['😀', '🎉', '❤️', '🔥', '👏', '😂', '🤔', '😢', '😍', '💯'] as const;

// 投影模式自动轮播间隔（毫秒）
export const PROJECTOR_AUTO_SCROLL_INTERVAL = 15000;

// WebSocket 重连间隔（毫秒）
export const WS_RECONNECT_INTERVAL = 3000;

// WebSocket 最大重连次数
export const WS_MAX_RECONNECT_ATTEMPTS = 10;

// API 路径
export const API_PATHS = {
  SESSIONS: '/api/sessions',
  QUESTIONS: '/api/questions',
  ANSWERS: '/api/answers',
  VOTES: '/api/votes',
  REACTIONS: '/api/reactions',
} as const;

// LocalStorage Keys
export const STORAGE_KEYS = {
  VISITOR_ID: 'ama_visitor_id',
  ADMIN_TOKENS: 'ama_admin_tokens', // { [sessionId]: token }
} as const;
