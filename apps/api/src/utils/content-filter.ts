interface ContentFilterResult {
  blocked: boolean;
  reason?: string;
}

/**
 * Lightweight content filter to block obvious spam/abuse.
 * Not meant to block all bad content — just the most blatant patterns.
 */
export function filterContent(content: string): ContentFilterResult {
  // 1. URL bombing: 3+ URLs in a single message
  const urlPattern = /https?:\/\/[^\s]+/gi;
  const urlMatches = content.match(urlPattern);
  if (urlMatches && urlMatches.length >= 3) {
    return { blocked: true, reason: 'Too many URLs in content' };
  }

  // 2. Repeated character spam: 20+ consecutive identical characters
  const repeatedCharPattern = /(.)\1{19,}/;
  if (repeatedCharPattern.test(content)) {
    return { blocked: true, reason: 'Repetitive character spam detected' };
  }

  // 3. All-caps bombing: if content is >50 chars and >80% uppercase letters
  const letters = content.replace(/[^a-zA-Z]/g, '');
  if (letters.length > 50) {
    const upperCount = (content.match(/[A-Z]/g) || []).length;
    if (upperCount / letters.length > 0.8) {
      return { blocked: true, reason: 'Excessive use of capital letters' };
    }
  }

  // 4. Repeated word spam: same word repeated 10+ times
  const words = content.toLowerCase().split(/\s+/);
  if (words.length >= 10) {
    const wordCounts = new Map<string, number>();
    for (const word of words) {
      if (word.length < 2) continue;
      const count = (wordCounts.get(word) || 0) + 1;
      wordCounts.set(word, count);
      if (count >= 10) {
        return { blocked: true, reason: 'Repeated word spam detected' };
      }
    }
  }

  return { blocked: false };
}
