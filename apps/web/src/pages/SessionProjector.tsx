import { Component, createSignal, createResource, createEffect, onCleanup, For, Show, onMount } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import Avatar from '../components/Avatar';
import { FullPageLoading } from '../components/Loading';
import { getSessionAdmin, getQuestions } from '../lib/api';
import { extractAndStoreToken, isAdmin } from '../lib/storage';
import { createSessionWebSocket } from '../lib/websocket';
import { renderMarkdown } from '../lib/markdown';
import { truncateText } from '../lib/markdown';
import { sortQuestions } from '../lib/sort';
import { PROJECTOR_AUTO_SCROLL_INTERVAL } from '@askmeanything/shared';
import type { Question, QuestionAddedData, QuestionUpdatedData, VoteChangedData, AnswerAddedData } from '@askmeanything/shared';

const SessionProjector: Component = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [questions, setQuestions] = createSignal<Question[]>([]);
  const [currentQuestionId, setCurrentQuestionId] = createSignal<string | null>(null);
  const [autoPlay, setAutoPlay] = createSignal(false);
  const [darkMode, setDarkMode] = createSignal(false);
  const [showAnsweredOnly, setShowAnsweredOnly] = createSignal(false);

  // 派生当前问题和索引
  const currentQuestion = () => questions().find(q => q.id === currentQuestionId());
  const currentIndex = () => {
    const id = currentQuestionId();
    if (!id) return 0;
    const idx = questions().findIndex(q => q.id === id);
    return idx >= 0 ? idx : 0;
  };

  onMount(() => {
    extractAndStoreToken(params.id);
    if (!isAdmin(params.id)) {
      navigate(`/s/${params.id}`);
    }
  });

  const [session] = createResource(() => params.id, async (id) => {
    try {
      return await getSessionAdmin(id);
    } catch (err) {
      navigate(`/s/${params.id}`);
      throw err;
    }
  });

  const fetchQuestions = async () => {
    try {
      const result = await getQuestions(params.id, {
        sortBy: 'votes',
        sortOrder: 'desc',
      }, true);

      let filtered = result.questions.filter(q => q.status !== 'pending' && q.status !== 'rejected');

      if (showAnsweredOnly()) {
        filtered = filtered.filter(q => q.status === 'answered');
      }

      setQuestions(filtered);
    } catch (err) {
      console.error('Failed to fetch questions:', err);
    }
  };

  createEffect(() => {
    if (!session()) return;
    showAnsweredOnly(); // track this signal
    fetchQuestions();
  });

  // 初始化：选中第一个问题
  createEffect(() => {
    if (questions().length > 0 && !currentQuestionId()) {
      setCurrentQuestionId(questions()[0].id);
    }
  });

  createEffect(() => {
    if (!session()) return;

    const ws = createSessionWebSocket(params.id, true);
    ws.connect();

    ws.on('question_added', (data: unknown) => {
      const { question } = data as QuestionAddedData;
      if (question.status === 'approved' || question.status === 'answered') {
        setQuestions(prev => sortQuestions([question, ...prev], 'votes'));
      }
    });

    ws.on('question_updated', (data: unknown) => {
      const { questionId, changes } = data as QuestionUpdatedData;
      if ((changes as any).deleted) {
        setQuestions(prev => prev.filter(q => q.id !== questionId));
      } else {
        setQuestions(prev => prev.map(q =>
          q.id === questionId ? { ...q, ...changes } : q
        ));
      }
    });

    ws.on('vote_changed', (data: unknown) => {
      const { questionId, voteCount } = data as VoteChangedData;
      setQuestions(prev => {
        const updated = prev.map(q => q.id === questionId ? { ...q, voteCount } : q);
        return sortQuestions(updated, 'votes');
      });
    });

    ws.on('answer_added', (data: unknown) => {
      const { answer } = data as AnswerAddedData;
      setQuestions(prev => prev.map(q =>
        q.id === answer.questionId ? { ...q, answer, status: 'answered' } : q
      ));
    });

    ws.on('session_ended', () => {
      navigate(`/s/${params.id}/ended`);
    });

    onCleanup(() => ws.disconnect());
  });

  createEffect(() => {
    if (!autoPlay()) return;

    const timer = setInterval(() => {
      const len = questions().length;
      if (len > 0) {
        const nextIdx = (currentIndex() + 1) % len;
        setCurrentQuestionId(questions()[nextIdx]?.id || null);
      }
    }, PROJECTOR_AUTO_SCROLL_INTERVAL);

    onCleanup(() => clearInterval(timer));
  });

  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          setCurrentQuestionId(questions()[Math.max(0, currentIndex() - 1)]?.id || null);
          break;
        case 'ArrowRight':
          setCurrentQuestionId(questions()[Math.min(questions().length - 1, currentIndex() + 1)]?.id || null);
          break;
        case ' ':
          e.preventDefault();
          setAutoPlay(prev => !prev);
          break;
        case 'f':
        case 'F':
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
          } else {
            document.exitFullscreen();
          }
          break;
        case 't':
        case 'T':
          setDarkMode(prev => !prev);
          break;
        case 'Escape':
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            navigate(`/s/${params.id}/admin`);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    onCleanup(() => window.removeEventListener('keydown', handleKeyDown));
  });

  const publicUrl = () => `${window.location.host}/s/${params.id}`;

  return (
    <Show when={!session.loading && session()} fallback={<FullPageLoading />}>
      <div
        class="min-h-screen flex flex-col transition-colors duration-500 font-sans"
        classList={{
          'bg-gray-950 text-white selection:bg-indigo-500 selection:text-white': darkMode(),
          'bg-white text-gray-900 selection:bg-primary-100 selection:text-primary-900': !darkMode(),
        }}
      >
        {/* Header */}
        <header
          class="px-8 py-5 flex items-center justify-between border-b backdrop-blur-sm bg-opacity-80"
          classList={{
            'border-gray-800 bg-gray-950/80': darkMode(),
            'border-gray-100 bg-white/80': !darkMode(),
          }}
        >
          <div class="flex items-center gap-4">
             <div class={`w-3 h-3 rounded-full ${autoPlay() ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
             <h1 class="text-2xl font-bold tracking-tight">
               {session()!.title}
             </h1>
          </div>
          <div 
             class="px-4 py-2 rounded-xl font-mono text-lg font-bold tracking-wide border transition-colors shadow-sm"
             classList={{
               'border-gray-700 bg-gray-900 text-indigo-400': darkMode(),
               'border-gray-200 bg-white text-gray-900': !darkMode(),
             }}
          >
            <span class="text-xs font-sans font-medium uppercase tracking-widest opacity-40 mr-3">Join at</span>
            {publicUrl()}
          </div>
        </header>

        {/* Main Content */}
        <main class="flex-1 flex min-h-0 overflow-hidden">
          {/* Left: Current Question (75%) */}
          <div class="flex-[3] p-12 flex flex-col justify-center relative overflow-y-auto custom-scrollbar">
            <Show
              when={currentQuestion()}
              fallback={
                <div class="flex-1 flex flex-col items-center justify-center text-gray-500 animate-pulse">
                  <div class="text-6xl mb-4">💬</div>
                  <div class="text-3xl font-light">Waiting for questions...</div>
                </div>
              }
            >
              <div class="max-w-5xl mx-auto w-full animate-fade-in">
                {/* Author Info */}
                <div class="flex items-center gap-5 mb-8 opacity-80">
                  <Avatar seed={currentQuestion()!.authorId} size={64} class="rounded-2xl shadow-lg" />
                  <div>
                    <div class="text-2xl font-medium">
                      {currentQuestion()!.authorName || 'Anonymous'}
                    </div>
                    <div class="flex gap-3 mt-1 text-base opacity-70">
                       <Show when={currentQuestion()!.isPinned}>
                          <span class="text-indigo-400 font-bold flex items-center gap-1">
                             <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                             Pinned
                          </span>
                       </Show>
                       <span>{new Date(currentQuestion()!.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                {/* Question Content */}
                <div class="text-5xl font-bold leading-tight mb-12 tracking-tight">
                  {currentQuestion()!.content}
                </div>

                {/* Answer Section */}
                <Show when={currentQuestion()!.answer}>
                  <div
                    class="relative pl-10 py-8 pr-8 rounded-r-3xl border-l-[6px] my-8 shadow-sm"
                    classList={{
                      'border-indigo-500 bg-white/5': darkMode(),
                      'border-gray-900 bg-gray-50': !darkMode(),
                    }}
                  >
                    <div 
                      class="absolute -left-[9px] top-8 w-4 h-4 rounded-full border-[3px]"
                      classList={{
                         'bg-gray-950 border-indigo-500': darkMode(),
                         'bg-white border-gray-900': !darkMode()
                      }}
                    ></div>
                    <div class="mb-2 text-xs font-bold uppercase tracking-wider opacity-50">Host Answer</div>
                    <div
                      class="text-3xl leading-relaxed markdown-content"
                      classList={{ 'projector-mode': darkMode() }}
                      innerHTML={renderMarkdown(currentQuestion()!.answer!.content)}
                    />
                  </div>
                </Show>

                {/* Interaction Stats */}
                <div
                  class="mt-12 flex items-center gap-8"
                  classList={{
                    'text-gray-400': darkMode(),
                    'text-gray-500 font-medium': !darkMode(),
                  }}
                >
                  <div 
                    class="flex items-center gap-3 px-6 py-3 rounded-2xl border transition-colors shadow-sm"
                    classList={{
                      'bg-white/10 border-white/10': darkMode(),
                      'bg-gray-900 border-gray-900 text-white': !darkMode(),
                    }}
                  >
                    <svg class="w-8 h-8 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg>
                    <span class="font-bold text-4xl">{currentQuestion()!.voteCount}</span>
                  </div>
                  
                  <div class="flex gap-4">
                    <For each={currentQuestion()!.reactions?.slice(0, 8)}>
                      {(reaction) => (
                        <div 
                          class="flex items-center gap-2 px-5 py-3 rounded-2xl border transition-colors shadow-sm"
                          classList={{
                            'bg-white/5 border-white/5': darkMode(),
                            'bg-white border-gray-100 text-gray-900': !darkMode(),
                          }}
                        >
                          <span class="text-3xl">{reaction.emoji}</span>
                          <span class="text-2xl font-bold opacity-80">{reaction.count}</span>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </div>
            </Show>
          </div>

          {/* Right: List (25%) */}
          <div
            class="flex-[1] border-l flex flex-col min-w-[300px] max-w-sm backdrop-blur-md"
            classList={{
              'border-gray-800 bg-gray-900/80': darkMode(),
              'border-gray-200 bg-white/80': !darkMode(),
            }}
          >
            <div class="p-4 border-b" classList={{ 'border-gray-800': darkMode(), 'border-gray-100': !darkMode() }}>
              <div class="text-xs font-bold uppercase tracking-widest opacity-40">
                 Queue • {questions().length}
              </div>
            </div>
            
            <div class="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
              <For each={questions()}>
                {(question, index) => {
                  const isSelected = () => question.id === currentQuestionId();
                  return (
                    <button
                      onClick={() => setCurrentQuestionId(question.id)}
                      class="w-full text-left p-4 rounded-xl transition-colors duration-150 group relative overflow-hidden border border-transparent"
                      classList={{
                        'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30': darkMode() && isSelected(),
                        'bg-gray-900 text-white shadow-lg shadow-gray-900/20': !darkMode() && isSelected(),
                        'hover:bg-gray-800 text-gray-400 hover:text-gray-200': darkMode() && !isSelected(),
                        'hover:bg-white hover:border-gray-200 text-gray-500 hover:text-gray-900': !darkMode() && !isSelected(),
                      }}
                    >
                      <div class="flex items-center justify-between mb-2">
                        <span class={`text-xs font-bold ${isSelected() ? 'opacity-100' : 'opacity-50'}`}>
                          #{index() + 1}
                        </span>
                        <span class={`text-xs font-bold ${isSelected() ? 'opacity-100' : 'opacity-50'}`}>
                          +{question.voteCount}
                        </span>
                      </div>
                      <div class="text-sm font-medium line-clamp-2 leading-relaxed">
                        {truncateText(question.content, 60)}
                      </div>
                      {isSelected() && (
                        <div class="absolute left-0 top-0 bottom-0 w-1 bg-white/50"></div>
                      )}
                    </button>
                  );
                }}
              </For>
            </div>
          </div>
        </main>

        {/* Footer Controls */}
        <footer
          class="px-8 py-4 border-t flex items-center justify-between text-sm font-medium"
          classList={{
            'border-gray-800 bg-gray-950 text-gray-500': darkMode(),
            'border-gray-200 bg-white text-gray-400': !darkMode(),
          }}
        >
          <div class="flex gap-6">
             <div class="flex items-center gap-2">
               <kbd class="px-2 py-1 rounded bg-opacity-20 bg-gray-500 min-w-[20px] text-center">←</kbd>
               <kbd class="px-2 py-1 rounded bg-opacity-20 bg-gray-500 min-w-[20px] text-center">→</kbd>
               <span>Nav</span>
             </div>
             <div class="flex items-center gap-2">
               <kbd class="px-2 py-1 rounded bg-opacity-20 bg-gray-500 min-w-[40px] text-center">Space</kbd>
               <span>{autoPlay() ? 'Pause' : 'Play'}</span>
             </div>
             <div class="flex items-center gap-2">
               <kbd class="px-2 py-1 rounded bg-opacity-20 bg-gray-500 min-w-[20px] text-center">F</kbd>
               <span>Fullscreen</span>
             </div>
          </div>

          <div class="flex items-center gap-4">
            <button
               onClick={() => setDarkMode(!darkMode())}
               class="hover:text-indigo-500 transition-colors"
            >
               {darkMode() ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
        </footer>
      </div>
    </Show>
  );
};

export default SessionProjector;