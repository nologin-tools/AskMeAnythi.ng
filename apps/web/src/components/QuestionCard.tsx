import { Component, Show, createSignal, For } from 'solid-js';
import type { Question, ReportReason } from '@askmeanything/shared';
import Avatar from './Avatar';
import { renderSimpleMarkdown, renderMarkdown } from '../lib/markdown';
import { formatRelativeTime } from '../lib/time';
import { QUICK_REACTIONS, COMMON_EMOJIS, VALID_REPORT_REASONS } from '@askmeanything/shared';
import { submitReport } from '../lib/api';

interface QuestionCardProps {
  question: Question;
  sessionId: string;
  isAdmin?: boolean;
  onVote?: (questionId: string) => void;
  onReaction?: (questionId: string, emoji: string) => void;
  onApprove?: (questionId: string) => void;
  onReject?: (questionId: string) => void;
  onPin?: (questionId: string, isPinned: boolean) => void;
  onAnswer?: (questionId: string) => void;
  onMarkAnswered?: (questionId: string) => void;
  onDelete?: (questionId: string) => void;
}

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  offensive: 'Offensive',
  inappropriate: 'Inappropriate',
  other: 'Other',
};

const QuestionCard: Component<QuestionCardProps> = (props) => {
  const [showReactions, setShowReactions] = createSignal(false);
  const [showReportModal, setShowReportModal] = createSignal(false);
  const [reportReason, setReportReason] = createSignal<ReportReason>('spam');
  const [reportDescription, setReportDescription] = createSignal('');
  const [reportSubmitting, setReportSubmitting] = createSignal(false);
  const [reportError, setReportError] = createSignal<string | null>(null);
  const [reported, setReported] = createSignal(false);

  const handleReport = async () => {
    setReportSubmitting(true);
    setReportError(null);
    try {
      await submitReport({
        targetType: 'question',
        targetId: props.question.id,
        sessionId: props.sessionId,
        reason: reportReason(),
        description: reportDescription() || undefined,
      });
      setReported(true);
      setShowReportModal(false);
    } catch (err: any) {
      setReportError(err.message || 'Failed to submit report');
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleVote = () => {
    props.onVote?.(props.question.id);
  };

  const handleReaction = (emoji: string) => {
    props.onReaction?.(props.question.id, emoji);
    setShowReactions(false);
  };

  return (
    <div
      class="group relative bg-white rounded-2xl p-6 transition-all duration-300 border border-transparent hover:border-gray-100 hover:shadow-float"
      classList={{
        'ring-1 ring-gray-900/5 bg-gray-50/30': props.question.isPinned,
        'opacity-60 grayscale': props.question.status === 'rejected',
      }}
    >
      {/* Pinned Marker */}
      <Show when={props.question.isPinned}>
        <div class="absolute top-6 right-6 text-gray-400" title="已置顶">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16 5l-8 8H5l3 3 3 3v-3l8-8h3l-3-3h-3zM5 21v-3l3 3H5z"/></svg>
        </div>
      </Show>

      {/* Author & Meta */}
      <div class="flex items-center gap-3 mb-4">
        <Avatar seed={props.question.authorId} size={32} class="rounded-full ring-2 ring-white shadow-sm" />
        <div class="flex flex-col">
          <div class="flex items-center gap-2">
            <span class="font-medium text-gray-900 text-sm">
              {props.question.authorName || 'Anonymous'}
            </span>
            <Show when={props.question.status === 'answered'}>
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </Show>
          </div>
          <span class="text-xs text-gray-400 font-normal">
            {formatRelativeTime(props.question.createdAt)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div
        class="markdown-content text-gray-800 text-base font-normal leading-relaxed mb-6"
        innerHTML={renderSimpleMarkdown(props.question.content)}
      />

      {/* Answer Section - Minimalist */}
      <Show when={props.question.answer}>
        <div class="mt-6 pl-4 border-l-2 border-gray-100 py-1">
          <div class="flex items-center gap-2 mb-2">
            <Avatar seed="admin" size={20} class="rounded-full grayscale opacity-70" />
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Host Answer</span>
          </div>
          <div
            class="markdown-content text-gray-600 text-sm"
            innerHTML={renderMarkdown(props.question.answer!.content)}
          />
        </div>
      </Show>

      {/* Actions Footer */}
      <div class="flex items-center justify-between pt-2">
        <div class="flex items-center gap-3">
          {/* Vote Button - Clean Outline */}
          <button
            onClick={handleVote}
            class="group/vote flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200"
            classList={{
              'bg-gray-900 text-white border-gray-900': props.question.hasVoted,
              'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-900': !props.question.hasVoted,
            }}
          >
            <svg class="w-4 h-4" fill={props.question.hasVoted ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 15l7-7 7 7" />
            </svg>
            <span class="text-sm font-medium">{props.question.voteCount}</span>
          </button>

          {/* Reactions */}
          <div class="flex items-center gap-1.5 flex-wrap">
            <For each={props.question.reactions}>
              {(reaction) => (
                <button
                  onClick={() => handleReaction(reaction.emoji)}
                  class="flex items-center gap-1 px-2 py-1.5 rounded-full text-xs transition-colors border"
                  classList={{
                    'bg-gray-50 border-gray-200 text-gray-900': reaction.hasReacted,
                    'bg-white border-transparent text-gray-400 hover:bg-gray-50': !reaction.hasReacted,
                  }}
                >
                  <span class="text-sm">{reaction.emoji}</span>
                  <span class="font-medium">{reaction.count}</span>
                </button>
              )}
            </For>

            {/* Add Reaction */}
            <div class="relative">
              <button
                onClick={() => setShowReactions(!showReactions())}
                class="w-8 h-8 flex items-center justify-center rounded-full text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              <Show when={showReactions()}>
                <div class="absolute left-0 top-full mt-2 z-30 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 min-w-[200px] animate-scale-in origin-top-left">
                  <div class="grid grid-cols-5 gap-1 relative z-20">
                    <For each={[...QUICK_REACTIONS, ...COMMON_EMOJIS].slice(0, 10)}>
                      {(emoji) => (
                        <button
                          onClick={() => handleReaction(emoji)}
                          class="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-50 text-xl transition-colors"
                        >
                          {emoji}
                        </button>
                      )}
                    </For>
                  </div>
                  <div
                    class="fixed inset-0 z-10"
                    onClick={() => setShowReactions(false)}
                  />
                </div>
              </Show>
            </div>
          </div>

          {/* Report button (non-admin only) */}
          <Show when={!props.isAdmin && !reported()}>
            <button
              onClick={() => setShowReportModal(true)}
              class="ml-auto w-8 h-8 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
              title="Report"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
            </button>
          </Show>
          <Show when={reported()}>
            <span class="ml-auto text-xs text-gray-400">Reported</span>
          </Show>
        </div>
      </div>

      {/* Report Modal */}
      <Show when={showReportModal()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowReportModal(false)}>
          <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 class="text-lg font-semibold mb-4">Report Question</h3>

            <div class="space-y-2 mb-4">
              <For each={[...VALID_REPORT_REASONS]}>
                {(reason) => (
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="report-reason"
                      value={reason}
                      checked={reportReason() === reason}
                      onChange={() => setReportReason(reason)}
                      class="accent-black"
                    />
                    <span class="text-sm">{REASON_LABELS[reason] || reason}</span>
                  </label>
                )}
              </For>
            </div>

            <textarea
              value={reportDescription()}
              onInput={(e) => setReportDescription(e.currentTarget.value)}
              placeholder="Additional details (optional)"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none h-20 focus:outline-none focus:border-gray-400 mb-4"
              maxLength={500}
            />

            <Show when={reportError()}>
              <p class="text-sm text-red-500 mb-3">{reportError()}</p>
            </Show>

            <div class="flex gap-2 justify-end">
              <button
                onClick={() => setShowReportModal(false)}
                class="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReport}
                disabled={reportSubmitting()}
                class="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {reportSubmitting() ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Admin Controls - Overlay on Hover or Always Visible if mobile */}
      <Show when={props.isAdmin}>
        <div class="mt-6 pt-4 border-t border-dashed border-gray-100 flex flex-wrap gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <Show when={props.question.status === 'pending'}>
            <button onClick={() => props.onApprove?.(props.question.id)} class="btn-primary text-xs py-1.5 px-3 rounded-lg h-8">
              Approve
            </button>
            <button onClick={() => props.onReject?.(props.question.id)} class="btn-secondary text-xs py-1.5 px-3 rounded-lg h-8 text-red-600 hover:border-red-200">
              Reject
            </button>
          </Show>

          <Show when={props.question.status !== 'rejected'}>
            <button onClick={() => props.onPin?.(props.question.id, !props.question.isPinned)} class="btn-secondary text-xs py-1.5 px-3 rounded-lg h-8">
              {props.question.isPinned ? 'Unpin' : 'Pin'}
            </button>

            <button onClick={() => props.onAnswer?.(props.question.id)} class="btn-secondary text-xs py-1.5 px-3 rounded-lg h-8">
              {props.question.answer ? 'Edit Answer' : 'Answer'}
            </button>
            
            <Show when={!props.question.answer}>
               <button onClick={() => props.onMarkAnswered?.(props.question.id)} class="btn-ghost text-xs py-1.5 px-3 h-8">
                Mark Done
              </button>
            </Show>
          </Show>
          
          <div class="flex-1"></div>
          <button onClick={() => props.onDelete?.(props.question.id)} class="text-gray-300 hover:text-red-500 transition-colors p-1" title="Delete">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </Show>
    </div>
  );
};

export default QuestionCard;
