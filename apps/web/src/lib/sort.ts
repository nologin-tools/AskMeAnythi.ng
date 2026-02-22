import type { Question } from '@askmeanything/shared';

export type SortBy = 'votes' | 'time';

/**
 * 排序问题列表
 * - 置顶问题始终优先
 * - 按 votes 或 time 排序
 */
export function sortQuestions(questions: Question[], sortBy: SortBy): Question[] {
  return [...questions].sort((a, b) => {
    // 置顶优先
    if (a.isPinned !== b.isPinned) {
      return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
    }
    // 按排序方式
    if (sortBy === 'votes') {
      return b.voteCount - a.voteCount;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
