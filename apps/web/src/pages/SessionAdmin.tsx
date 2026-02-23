import { Component, createSignal, createResource, createEffect, onCleanup, For, Show, onMount } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import Logo from '../components/Logo';
import QuestionCard from '../components/QuestionCard';
import FilterBar, { FilterStatus, SortBy } from '../components/FilterBar';
import AnswerEditor from '../components/AnswerEditor';
import ConnectionStatus from '../components/ConnectionStatus';
import Modal from '../components/Modal';
import CopyButton from '../components/CopyButton';
import Toast, { showToast } from '../components/Toast';
import { FullPageLoading } from '../components/Loading';
import {
  getSessionAdmin,
  getQuestions,
  updateQuestion,
  deleteQuestion,
  upsertAnswer,
  markAnswered,
  toggleVote,
  toggleReaction,
  updateSession,
  deleteSession,
} from '../lib/api';
import { extractAndStoreToken, getAdminToken, isAdmin } from '../lib/storage';
import { createSessionWebSocket } from '../lib/websocket';
import { sortQuestions } from '../lib/sort';
import { TTL_OPTIONS, DEFAULT_TITLE, RATE_LIMIT_WINDOW_OPTIONS, MAX_QUESTIONS_PER_VISITOR_LIMIT, MAX_RATE_LIMIT_COUNT } from '@askmeanything/shared';
import type { Question } from '@askmeanything/shared';
import QRCode from 'qrcode';

const SessionAdmin: Component = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [status, setStatus] = createSignal<FilterStatus>('all');
  const [sortBy, setSortBy] = createSignal<SortBy>('votes');
  const [questions, setQuestions] = createSignal<Question[]>([]);
  const [connected, setConnected] = createSignal(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
  const [deleteConfirmText, setDeleteConfirmText] = createSignal('');
  const [answerEditor, setAnswerEditor] = createSignal<{ questionId: string; content: string; questionContent: string } | null>(null);

  // Inline editing states
  const [editingTitle, setEditingTitle] = createSignal(false);
  const [editingDesc, setEditingDesc] = createSignal(false);
  const [editTitleValue, setEditTitleValue] = createSignal('');
  const [editDescValue, setEditDescValue] = createSignal('');

  // QR Code states
  const [showQR, setShowQR] = createSignal(false);
  const [qrDataUrl, setQrDataUrl] = createSignal('');

  // Mobile panel collapsed state
  const [panelExpanded, setPanelExpanded] = createSignal(false);

  // Init
  onMount(() => {
    extractAndStoreToken(params.id);
    if (!isAdmin(params.id)) navigate(`/s/${params.id}`);
  });

  const [session, { refetch: refetchSession }] = createResource(() => params.id, async (id) => {
    try { return await getSessionAdmin(id); }
    catch (err) { navigate(`/s/${id}`); throw err; }
  });

  // Fetching & WS
  const fetchQuestions = async () => {
    const apiStatus = status() === 'unanswered' ? 'approved' : status();
    const result = await getQuestions(params.id, { status: apiStatus === 'all' ? undefined : apiStatus, sortBy: sortBy(), sortOrder: 'desc' }, true);
    let filtered = result.questions;
    if (status() === 'unanswered') filtered = filtered.filter(q => q.status !== 'answered' && q.status !== 'rejected');
    setQuestions(filtered);
  };

  createEffect(() => { if (session()) fetchQuestions(); });

  createEffect(() => {
    if (!session()) return;
    const ws = createSessionWebSocket(params.id, true);
    ws.connect(setConnected);
    ws.on('question_added', (d: any) => setQuestions(p => sortQuestions([d.question, ...p], sortBy())));
    ws.on('question_updated', (d: any) => d.changes.deleted ? setQuestions(p => p.filter(q => q.id !== d.questionId)) : setQuestions(p => p.map(q => q.id === d.questionId ? { ...q, ...d.changes } : q)));
    ws.on('vote_changed', (d: any) => setQuestions(p => sortQuestions(p.map(q => q.id === d.questionId ? { ...q, voteCount: d.voteCount } : q), sortBy())));
    ws.on('answer_added', (d: any) => setQuestions(p => p.map(q => q.id === d.answer.questionId ? { ...q, answer: d.answer, status: 'answered' } : q)));
    ws.on('reaction_changed', (d: any) => { if(d.targetType==='question') setQuestions(p => p.map(q => q.id === d.targetId ? { ...q, reactions: d.reactions } : q)); });
    ws.on('session_updated', () => refetchSession());

    onCleanup(() => ws.disconnect());
  });

  // Actions
  const handleApprove = async (id: string) => { await updateQuestion(id, params.id, { status: 'approved' }); showToast('Approved', 'success'); };
  const handleReject = async (id: string) => { await updateQuestion(id, params.id, { status: 'rejected' }); showToast('Rejected', 'success'); };
  const handlePin = async (id: string, isPinned: boolean) => { await updateQuestion(id, params.id, { isPinned }); showToast(isPinned ? 'Pinned' : 'Unpinned', 'success'); };
  const handleDeleteQuestion = async (id: string) => { if(confirm('Delete this question?')) { await deleteQuestion(id, params.id); showToast('Deleted', 'success'); } };
  const handleAnswer = (id: string) => { const q = questions().find(q => q.id === id); setAnswerEditor({ questionId: id, content: q?.answer?.content || '', questionContent: q?.content || '' }); };
  const handleSubmitAnswer = async (content: string) => { await upsertAnswer(answerEditor()!.questionId, params.id, { content }); showToast('Answer saved', 'success'); setAnswerEditor(null); };
  const handleMarkAnswered = async (id: string) => { await markAnswered(id, params.id); showToast('Marked as done', 'success'); };
  const handleVote = async (id: string) => { const res = await toggleVote(id); setQuestions(p => p.map(q => q.id === id ? { ...q, hasVoted: res.voted, voteCount: res.voteCount } : q)); };
  const handleReaction = async (id: string, emoji: string) => { const res = await toggleReaction({ targetType: 'question', targetId: id, emoji }); setQuestions(p => p.map(q => q.id === id ? { ...q, reactions: res.reactions } : q)); };

  // Auto-save settings handlers
  const handleTtlChange = async (ttl: number) => {
    try {
      await updateSession(params.id, { ttlDays: ttl });
      await refetchSession();
      showToast('Auto-delete updated', 'success');
    } catch { showToast('Failed to save', 'error'); }
  };

  const handleModerationChange = async (moderation: boolean) => {
    try {
      await updateSession(params.id, { requireModeration: moderation });
      await refetchSession();
      showToast('Moderation updated', 'success');
    } catch { showToast('Failed to save', 'error'); }
  };

  const handleMaxQuestionsChange = async (value: number) => {
    try {
      await updateSession(params.id, { maxQuestionsPerVisitor: value });
      await refetchSession();
      showToast('Question limit updated', 'success');
    } catch { showToast('Failed to save', 'error'); }
  };

  const handleRateLimitCountChange = async (value: number) => {
    try {
      await updateSession(params.id, { rateLimitCount: value });
      await refetchSession();
      showToast('Rate limit updated', 'success');
    } catch { showToast('Failed to save', 'error'); }
  };

  const handleRateLimitWindowChange = async (value: number) => {
    try {
      await updateSession(params.id, { rateLimitWindow: value });
      await refetchSession();
      showToast('Rate limit window updated', 'success');
    } catch { showToast('Failed to save', 'error'); }
  };

  const handleDeleteSession = async () => {
    if (deleteConfirmText() !== session()?.title) return showToast('Incorrect title', 'error');
    try { await deleteSession(params.id); showToast('Session deleted', 'success'); navigate('/'); } catch { showToast('Failed to delete', 'error'); }
  };

  const pendingCount = () => questions().filter(q => q.status === 'pending').length;

  // URLs
  const publicUrl = () => `${window.location.origin}/s/${params.id}`;
  const adminUrl = () => `${window.location.origin}/s/${params.id}/admin#${getAdminToken(params.id)}`;

  // QR Code
  const generateQR = async () => {
    try {
      const dataUrl = await QRCode.toDataURL(publicUrl(), {
        width: 400, margin: 1, color: { dark: '#000000', light: '#ffffff' },
      });
      setQrDataUrl(dataUrl);
      setShowQR(true);
    } catch (err) { console.error(err); }
  };

  // Inline editing handlers
  const startEditTitle = () => {
    setEditTitleValue(session()?.title === DEFAULT_TITLE ? '' : session()?.title || '');
    setEditingTitle(true);
  };

  const cancelEditTitle = () => {
    setEditingTitle(false);
    setEditTitleValue('');
  };

  const saveTitle = async () => {
    const newTitle = editTitleValue().trim() || DEFAULT_TITLE;
    if (newTitle !== session()?.title) {
      try {
        await updateSession(params.id, { title: newTitle });
        await refetchSession();
        showToast('Title updated', 'success');
      } catch { showToast('Failed to save', 'error'); }
    }
    setEditingTitle(false);
  };

  const startEditDesc = () => {
    setEditDescValue(session()?.description || '');
    setEditingDesc(true);
  };

  const cancelEditDesc = () => {
    setEditingDesc(false);
    setEditDescValue('');
  };

  const saveDesc = async () => {
    const newDesc = editDescValue().trim();
    if (newDesc !== (session()?.description || '')) {
      try {
        await updateSession(params.id, { description: newDesc || undefined });
        await refetchSession();
        showToast('Description updated', 'success');
      } catch { showToast('Failed to save', 'error'); }
    }
    setEditingDesc(false);
  };

  const handleTitleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); saveTitle(); }
    else if (e.key === 'Escape') { cancelEditTitle(); }
  };

  const handleDescKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveDesc(); }
    else if (e.key === 'Escape') { cancelEditDesc(); }
  };

  // Control Panel Component (reused for desktop sidebar and mobile collapsed)
  const ControlPanel = () => (
    <div class="space-y-6">
      {/* Session Info */}
      <div class="space-y-4">
        {/* Title */}
        <div>
          <Show when={editingTitle()} fallback={
            <div
              class="group flex items-center gap-2 cursor-pointer hover:bg-gray-100 rounded-lg px-2 py-1 -mx-2 transition-colors"
              onClick={startEditTitle}
              title="Click to edit"
            >
              <h2 class="text-lg font-bold tracking-tight text-gray-900 break-words">{session()!.title}</h2>
              <svg class="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
          }>
            <input
              type="text"
              value={editTitleValue()}
              onInput={(e) => setEditTitleValue(e.currentTarget.value)}
              onBlur={saveTitle}
              onKeyDown={handleTitleKeyDown}
              class="w-full text-lg font-bold tracking-tight text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-black/10"
              placeholder="Session Title"
              autofocus
            />
          </Show>
        </div>

        {/* Description */}
        <div>
          <Show when={editingDesc()} fallback={
            <div
              class="group flex items-start gap-2 cursor-pointer hover:bg-gray-100 rounded-lg px-2 py-1 -mx-2 transition-colors min-h-[32px]"
              onClick={startEditDesc}
              title="Click to edit"
            >
              <p class="text-sm text-gray-500 flex-1 break-words">{session()!.description || 'Add a description...'}</p>
              <svg class="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
          }>
            <textarea
              value={editDescValue()}
              onInput={(e) => setEditDescValue(e.currentTarget.value)}
              onBlur={saveDesc}
              onKeyDown={handleDescKeyDown}
              class="w-full text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-black/10 resize-none"
              placeholder="Add a description..."
              rows={2}
              autofocus
            />
          </Show>
        </div>
      </div>

      {/* Links Section */}
      <div class="space-y-3 pt-4 border-t border-gray-200">
        <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Links</h3>

        {/* Public Link */}
        <div class="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span class="text-xs font-medium text-gray-600">Public Link</span>
            </div>
            <span class="text-xs font-mono text-gray-400 truncate block">{publicUrl()}</span>
          </div>
          <div class="flex items-center gap-1 flex-shrink-0">
            <button onClick={generateQR} class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Show QR Code">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
            </button>
            <CopyButton text={publicUrl()} />
          </div>
        </div>

        {/* Admin Link */}
        <div class="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span class="text-xs font-medium text-gray-600">Admin Link</span>
              <span class="px-1 py-0.5 bg-gray-200 text-gray-600 rounded text-[10px] font-bold">SECRET</span>
            </div>
            <span class="text-xs font-mono text-gray-400 truncate block">*************</span>
          </div>
          <CopyButton text={adminUrl()} />
        </div>
      </div>

      {/* Settings Section */}
      <div class="space-y-4 pt-4 border-t border-gray-200">
        <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Settings</h3>

        {/* Auto-delete */}
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600">Auto-delete</span>
          <select
            value={session()?.ttlDays || 1}
            onChange={(e) => handleTtlChange(parseInt(e.currentTarget.value))}
            class="text-sm font-medium bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-black/10 cursor-pointer hover:bg-gray-100 transition-colors"
          >
            {TTL_OPTIONS.map(d => <option value={d}>{d} days</option>)}
          </select>
        </div>

        {/* Moderation */}
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600">Moderation</span>
          <label class="relative cursor-pointer">
            <input
              type="checkbox"
              checked={session()?.requireModeration || false}
              onChange={(e) => handleModerationChange(e.currentTarget.checked)}
              class="sr-only peer"
            />
            <div class="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
          </label>
        </div>
      </div>

      {/* Question Limits */}
      <div class="space-y-4 pt-4 border-t border-gray-200">
        <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Question Limits</h3>

        {/* Max questions per visitor */}
        <div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">Per-visitor limit</span>
            <input
              type="number"
              min={0}
              max={MAX_QUESTIONS_PER_VISITOR_LIMIT}
              value={session()?.maxQuestionsPerVisitor ?? 0}
              onChange={(e) => handleMaxQuestionsChange(parseInt(e.currentTarget.value) || 0)}
              class="w-20 text-sm font-medium text-right bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>
          <p class="text-xs text-gray-400 mt-1">Max questions per visitor. 0 = unlimited.</p>
        </div>

        {/* Rate limit count */}
        <div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">Rate limit</span>
            <input
              type="number"
              min={0}
              max={MAX_RATE_LIMIT_COUNT}
              value={session()?.rateLimitCount ?? 0}
              onChange={(e) => handleRateLimitCountChange(parseInt(e.currentTarget.value) || 0)}
              class="w-20 text-sm font-medium text-right bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>
          <p class="text-xs text-gray-400 mt-1">Max questions per time window. 0 = unlimited.</p>
        </div>

        {/* Rate limit window */}
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">Time window</span>
            <select
              value={session()?.rateLimitWindow ?? 60}
              onChange={(e) => handleRateLimitWindowChange(parseInt(e.currentTarget.value))}
              class="text-sm font-medium bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-black/10 cursor-pointer hover:bg-gray-100 transition-colors"
            >
              {RATE_LIMIT_WINDOW_OPTIONS.map(opt => <option value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
      </div>

      {/* Danger Zone */}
      <div class="pt-4 border-t border-gray-200">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium rounded-xl transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete Session
        </button>
      </div>
    </div>
  );

  return (
    <Show when={!session.loading && session()} fallback={<FullPageLoading />}>
      <div class="min-h-screen flex flex-col bg-gray-50/50">
        {/* Header - Light theme to match audience view */}
        <header class="bg-white border-b border-gray-100 px-4 md:px-6 py-3 sticky top-0 z-30">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <Logo />
              <span class="px-2 py-0.5 rounded text-xs font-mono bg-black text-white">Admin</span>
            </div>

            <div class="flex items-center gap-4">
              <ConnectionStatus connected={connected()} />
              <div class="h-4 w-px bg-gray-200"></div>
              <button
                onClick={() => navigate(`/s/${params.id}/projector`)}
                class="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Projector
              </button>
            </div>
          </div>
        </header>

        {/* Main Content - Split Layout */}
        <main class="flex-1 flex flex-col md:flex-row">
          {/* Mobile: Collapsible Panel */}
          <div class="md:hidden border-b border-gray-200 bg-white">
            <button
              onClick={() => setPanelExpanded(!panelExpanded())}
              class="w-full flex items-center justify-between px-4 py-3"
            >
              <div class="flex items-center gap-2">
                <span class="font-medium text-gray-900 truncate">{session()!.title}</span>
              </div>
              <svg
                class={`w-5 h-5 text-gray-400 transition-transform ${panelExpanded() ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <Show when={panelExpanded()}>
              <div class="px-4 pb-4">
                <ControlPanel />
              </div>
            </Show>
          </div>

          {/* Desktop: Left Sidebar */}
          <aside class="hidden md:block w-80 shrink-0 border-r border-gray-200 bg-white p-6 overflow-y-auto sticky top-[57px] h-[calc(100vh-57px)]">
            <ControlPanel />
          </aside>

          {/* Right: Questions List */}
          <div class="flex-1 p-4 md:p-6 overflow-y-auto">
            {/* Questions Header */}
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 class="text-xl font-bold tracking-tight text-gray-900">Questions</h2>
                <p class="text-gray-500 mt-1 text-sm">Manage incoming questions from your audience.</p>
              </div>
              <div class="bg-white p-1 rounded-xl border border-gray-200 shadow-sm inline-flex">
                <FilterBar
                  status={status()}
                  sortBy={sortBy()}
                  showPending={true}
                  pendingCount={pendingCount()}
                  onStatusChange={setStatus}
                  onSortChange={setSortBy}
                />
              </div>
            </div>

            {/* Questions Grid */}
            <Show
              when={questions().length > 0}
              fallback={
                <div class="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center bg-white">
                  <p class="text-gray-400 font-medium">No questions found</p>
                </div>
              }
            >
              <div class="grid gap-4">
                <For each={questions()}>
                  {(question) => (
                    <QuestionCard
                      question={question}
                      isAdmin={true}
                      onVote={handleVote}
                      onReaction={handleReaction}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      onPin={handlePin}
                      onAnswer={handleAnswer}
                      onMarkAnswered={handleMarkAnswered}
                      onDelete={handleDeleteQuestion}
                    />
                  )}
                </For>
              </div>
            </Show>
          </div>
        </main>

        {/* Modals */}
        <Show when={answerEditor()}>
          <AnswerEditor
            open={true}
            onClose={() => setAnswerEditor(null)}
            onSubmit={handleSubmitAnswer}
            initialContent={answerEditor()!.content}
            questionContent={answerEditor()!.questionContent}
          />
        </Show>

        <Modal open={showDeleteConfirm()} onClose={() => setShowDeleteConfirm(false)} title="Delete Session">
          <div class="space-y-4">
            <p class="text-gray-600 text-sm">This action cannot be undone. Please type <span class="font-bold text-black">{session()?.title}</span> to confirm.</p>
            <input type="text" value={deleteConfirmText()} onInput={(e) => setDeleteConfirmText(e.currentTarget.value)} class="input" placeholder="Type session title" />
            <div class="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowDeleteConfirm(false)} class="btn-secondary">Cancel</button>
              <button onClick={handleDeleteSession} disabled={deleteConfirmText() !== session()?.title} class="btn-danger">Delete Forever</button>
            </div>
          </div>
        </Modal>

        {/* QR Code Modal */}
        <Show when={showQR()}>
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/20 backdrop-blur-sm animate-fade-in" onClick={() => setShowQR(false)}>
            <div class="bg-white rounded-3xl p-8 shadow-2xl animate-scale-in max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
              <div class="mb-4 font-bold text-lg">Scan to Join</div>
              <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-inner inline-block mb-6">
                <img src={qrDataUrl()} alt="QR" class="w-48 h-48 mix-blend-multiply" />
              </div>
              <button onClick={() => setShowQR(false)} class="btn-secondary w-full">Close</button>
            </div>
          </div>
        </Show>

        <Toast />
      </div>
    </Show>
  );
};

export default SessionAdmin;
