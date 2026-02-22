import { STORAGE_KEYS, ADMIN_TOKEN_PATTERN, generateVisitorId } from '@askmeanything/shared';

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage may be full or unavailable (private mode)
  }
}

// 获取或创建访客 ID
export function getVisitorId(): string {
  let id = safeGetItem(STORAGE_KEYS.VISITOR_ID);
  if (!id) {
    id = generateVisitorId();
    safeSetItem(STORAGE_KEYS.VISITOR_ID, id);
  }
  return id;
}

// 获取管理员 Token
export function getAdminToken(sessionId: string): string | null {
  const tokens = getAdminTokens();
  return tokens[sessionId] || null;
}

// 设置管理员 Token
export function setAdminToken(sessionId: string, token: string): void {
  const tokens = getAdminTokens();
  tokens[sessionId] = token;
  safeSetItem(STORAGE_KEYS.ADMIN_TOKENS, JSON.stringify(tokens));
}

// 移除管理员 Token
export function removeAdminToken(sessionId: string): void {
  const tokens = getAdminTokens();
  delete tokens[sessionId];
  safeSetItem(STORAGE_KEYS.ADMIN_TOKENS, JSON.stringify(tokens));
}

// 获取所有管理员 Token
function getAdminTokens(): Record<string, string> {
  try {
    const stored = safeGetItem(STORAGE_KEYS.ADMIN_TOKENS);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// 检查是否是管理员
export function isAdmin(sessionId: string): boolean {
  return !!getAdminToken(sessionId);
}

// 从 URL hash 提取并存储 Token
export function extractAndStoreToken(sessionId: string): string | null {
  const hash = window.location.hash;
  if (hash && hash.length > 1) {
    const token = hash.slice(1); // 移除 # 前缀

    // Validate token format before storing
    if (ADMIN_TOKEN_PATTERN.test(token)) {
      setAdminToken(sessionId, token);
    }

    // 清除 URL 中的 hash
    history.replaceState(null, '', window.location.pathname);
    return getAdminToken(sessionId);
  }
  return getAdminToken(sessionId);
}
