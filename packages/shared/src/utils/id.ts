import { BASE58_CHARS, SESSION_ID_LENGTH, ADMIN_TOKEN_LENGTH } from '../constants';

/**
 * Generate a Base58-encoded random ID with rejection sampling to avoid modulo bias
 */
export function generateBase58Id(length: number): string {
  const charLen = BASE58_CHARS.length; // 58
  const limit = 256 - (256 % charLen); // 232, reject bytes >= limit
  const result: string[] = [];

  while (result.length < length) {
    const array = new Uint8Array(length - result.length);
    crypto.getRandomValues(array);
    for (const byte of array) {
      if (byte < limit && result.length < length) {
        result.push(BASE58_CHARS[byte % charLen]);
      }
    }
  }

  return result.join('');
}

/**
 * Generate a Session ID (5-char Base58)
 */
export function generateSessionId(): string {
  return generateBase58Id(SESSION_ID_LENGTH);
}

/**
 * Generate an Admin Token (32-char URL-safe Base64)
 */
export function generateAdminToken(): string {
  const array = new Uint8Array(ADMIN_TOKEN_LENGTH);
  crypto.getRandomValues(array);
  // URL-safe Base64
  const base64 = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return base64.slice(0, ADMIN_TOKEN_LENGTH);
}

/**
 * Generate a Visitor ID (UUID v4)
 */
export function generateVisitorId(): string {
  return crypto.randomUUID();
}

/**
 * Validate Session ID format
 */
const BASE58_SET = new Set(BASE58_CHARS.split(''));

export function isValidSessionId(id: string): boolean {
  if (id.length !== SESSION_ID_LENGTH) return false;
  for (const char of id) {
    if (!BASE58_SET.has(char)) return false;
  }
  return true;
}

/**
 * Generate a unique ID (for questions, answers, etc.) using full UUID
 */
export function generateUniqueId(): string {
  return crypto.randomUUID().replace(/-/g, '');
}
