import { Component, createSignal, createResource, createEffect, onCleanup, For, Show } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import Logo from '../components/Logo';
import QuestionCard from '../components/QuestionCard';
import QuestionInput from '../components/QuestionInput';
import FilterBar, { FilterStatus, SortBy } from '../components/FilterBar';
import ConnectionStatus from '../components/ConnectionStatus';
import Toast, { showToast } from '../components/Toast';
import { FullPageLoading } from '../components/Loading';
import { getSession, getQuestions, createQuestion, toggleVote, toggleReaction, getQuestionQuota, QuotaExceededError } from '../lib/api';
import { createSessionWebSocket } from '../lib/websocket';
import { sortQuestions } from '../lib/sort';
import type { Question, QuestionAddedData, QuestionUpdatedData, VoteChangedData, AnswerAddedData, ReactionChangedData, SessionUpdatedData, VisitorQuotaInfo } from '@askmeanything/shared';

const SessionPublic: Component = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [status, setStatus] = createSignal<FilterStatus>('all');
  const [sortBy, setSortBy] = createSignal<SortBy>('votes');
  const [questions, setQuestions] = createSignal<Question[]>([]);
  const [connected, setConnected] = createSignal(false);
  const [quota, setQuota] = createSignal<VisitorQuotaInfo | null>(null);

  // ... (Data fetching logic remains the same, omitting for brevity in thought process but keeping in file)
  // Re-implementing logic to ensure functionality
  const [session] = createResource(() => params.id, async (id) => {
    try {
      return await getSession(id);
    } catch (err: any) {
      if (err.message === 'Session expired' || err.message === 'Session not found') {
        navigate(`/s/${id}/ended`);
      }
      throw err;
    }
  });

  const fetchQuestions = async () => {
    try {
      const apiStatus = status() === 'unanswered' ? 'approved' : status();
      const result = await getQuestions(params.id, {
        status: apiStatus === 'all' ? undefined : apiStatus,
        sortBy: sortBy(),
        sortOrder: 'desc',
      });

      let filtered = result.questions;
      if (status() === 'unanswered') {
        filtered = filtered.filter(q => q.status !== 'answered');
      }

      setQuestions(filtered);
    } catch (err) {
      console.error('Failed to fetch questions:', err);
    }
  };

  const fetchQuota = async () => {
    try {
      const q = await getQuestionQuota(params.id);
      setQuota(q);
    } catch { /* ignore */ }
  };

  createEffect(() => {
    if (session()) {
      fetchQuestions();
      fetchQuota();
    }
  });

  createEffect(() => {
    if (!session()) return;
    const ws = createSessionWebSocket(params.id);
    ws.connect(setConnected);

    ws.on('question_added', (data: unknown) => {
      const { question } = data as QuestionAddedData;
      setQuestions(prev => sortQuestions([question, ...prev], sortBy()));
    });
    ws.on('question_updated', (data: unknown) => {
      const { questionId, changes } = data as QuestionUpdatedData;
      if ((changes as any).deleted) {
        setQuestions(prev => prev.filter(q => q.id !== questionId));
      } else {
        setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, ...changes } : q));
      }
    });
    ws.on('vote_changed', (data: unknown) => {
      const { questionId, voteCount } = data as VoteChangedData;
      setQuestions(prev => {
        const updated = prev.map(q => q.id === questionId ? { ...q, voteCount } : q);
        return sortQuestions(updated, sortBy());
      });
    });
    ws.on('answer_added', (data: unknown) => {
      const { answer } = data as AnswerAddedData;
      setQuestions(prev => prev.map(q => q.id === answer.questionId ? { ...q, answer, status: 'answered' } : q));
    });
    ws.on('reaction_changed', (data: unknown) => {
      const { targetType, targetId, reactions } = data as ReactionChangedData;
      if (targetType === 'question') {
        setQuestions(prev => prev.map(q => q.id === targetId ? { ...q, reactions } : q));
      }
    });
    ws.on('session_updated', () => fetchQuota());
    ws.on('session_ended', () => navigate(`/s/${params.id}/ended`));
    onCleanup(() => ws.disconnect());
  });

  const handleSubmitQuestion = async (content: string, authorName?: string) => {
    try {
      await createQuestion(params.id, { content, authorName });
      session()?.requireModeration ? showToast('Submitted for review', 'info') : showToast('Question added', 'success');
      fetchQuota();
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        setQuota(err.quota);
        showToast(err.message, 'error');
      } else {
        showToast('Failed to submit', 'error');
      }
    }
  };

  const handleVote = async (questionId: string) => {
    try {
      const result = await toggleVote(questionId);
      setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, hasVoted: result.voted, voteCount: result.voteCount } : q));
    } catch (err) { showToast('Error', 'error'); }
  };

  const handleReaction = async (questionId: string, emoji: string) => {
    try {
      const result = await toggleReaction({ targetType: 'question', targetId: questionId, emoji });
      setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, reactions: result.reactions } : q));
    } catch (err) { showToast('Error', 'error'); }
  };

  return (
    <Show when={!session.loading && session()} fallback={<FullPageLoading />}>
      <div class="min-h-screen flex flex-col bg-gray-50/50">
        {/* Minimal Header */}
        <header class="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div class="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
            <div class="flex items-center gap-4">
               <a href="/" class="hover:opacity-70 transition-opacity"><Logo size="sm" /></a>
               <div class="h-4 w-px bg-gray-200"></div>
               <h1 class="font-semibold text-gray-900 truncate max-w-[200px] sm:max-w-md">{session()!.title}</h1>
            </div>
            <ConnectionStatus connected={connected()} />
          </div>
        </header>

        {/* Filter - Integrated into flow */}
        <div class="max-w-2xl mx-auto w-full px-4 pt-8 pb-4">
           <div class="flex items-center justify-between mb-2">
              <h2 class="text-2xl font-bold tracking-tight text-gray-900">Questions</h2>
              <div class="text-sm text-gray-400 font-medium">{questions().length} total</div>
           </div>
           
           <FilterBar
              status={status()}
              sortBy={sortBy()}
              showPending={false}
              onStatusChange={setStatus}
              onSortChange={setSortBy}
           />
        </div>

        {/* Questions List */}
        <main class="flex-1 max-w-2xl mx-auto w-full px-4 pb-32">
          <Show
            when={questions().length > 0}
            fallback={
              <div class="py-24 text-center">
                <p class="text-xl font-medium text-gray-300 mb-2">No questions yet</p>
                <p class="text-sm text-gray-400">Be the first to ask something interesting.</p>
              </div>
            }
          >
            <div class="space-y-4">
              <For each={questions()}>
                {(question) => (
                  <QuestionCard
                    question={question}
                    sessionId={params.id}
                    onVote={handleVote}
                    onReaction={handleReaction}
                  />
                )}
              </For>
            </div>
          </Show>
        </main>

        {/* Floating Input - Bottom Fixed */}
        <div class="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-white via-white/90 to-transparent pt-12">
          <div class="max-w-2xl mx-auto">
             <QuestionInput onSubmit={handleSubmitQuestion} quota={quota()} />
          </div>
        </div>

        <Toast />
      </div>
    </Show>
  );
};

export default SessionPublic;
