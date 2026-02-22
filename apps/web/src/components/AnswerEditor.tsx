import { Component, createSignal, Show } from 'solid-js';
import Modal from './Modal';
import { renderMarkdown } from '../lib/markdown';
import { MAX_ANSWER_LENGTH } from '@askmeanything/shared';

interface AnswerEditorProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (content: string) => Promise<void>;
  initialContent?: string;
  questionContent?: string;
}

const AnswerEditor: Component<AnswerEditorProps> = (props) => {
  const [content, setContent] = createSignal(props.initialContent || '');
  const [preview, setPreview] = createSignal(false);
  const [submitting, setSubmitting] = createSignal(false);

  const handleSubmit = async () => {
    const text = content().trim();
    if (!text || submitting()) return;

    setSubmitting(true);
    try {
      await props.onSubmit(text);
      props.onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Write Answer"
    >
      <div class="space-y-6">
        {/* Question Context */}
        <Show when={props.questionContent}>
          <div class="p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-700">
            <div class="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">Question</div>
            <div class="leading-relaxed font-medium">{props.questionContent}</div>
          </div>
        </Show>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
             <label class="text-sm font-semibold text-gray-900">Your Answer</label>
             {/* Toggle */}
             <div class="flex bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setPreview(false)}
                  class="px-3 py-1 text-xs font-medium rounded-md transition-all"
                  classList={{
                    'bg-white text-gray-900 shadow-sm': !preview(),
                    'text-gray-500 hover:text-gray-900': preview(),
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => setPreview(true)}
                  class="px-3 py-1 text-xs font-medium rounded-md transition-all"
                  classList={{
                    'bg-white text-gray-900 shadow-sm': preview(),
                    'text-gray-500 hover:text-gray-900': !preview(),
                  }}
                >
                  Preview
                </button>
             </div>
          </div>

          {/* Editor/Preview Area */}
          <div class="relative">
            <Show
              when={!preview()}
              fallback={
                <div class="min-h-[200px] max-h-[400px] overflow-y-auto p-4 border border-gray-200 rounded-xl bg-gray-50 markdown-content">
                  <Show when={content().trim()} fallback={<span class="text-gray-400 italic">Nothing to preview...</span>}>
                    <div innerHTML={renderMarkdown(content())} />
                  </Show>
                </div>
              }
            >
              <textarea
                value={content()}
                onInput={(e) => setContent(e.currentTarget.value)}
                placeholder="Type your answer here..."
                rows={8}
                maxLength={MAX_ANSWER_LENGTH}
                class="input font-mono text-sm leading-relaxed p-4 bg-white"
              />
            </Show>
            <div class="mt-2 flex items-center justify-between text-xs text-gray-400">
              <p class="flex items-center gap-2">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Markdown supported
              </p>
              <span>{content().length}/{MAX_ANSWER_LENGTH}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div class="flex justify-end gap-3 pt-2">
          <button
            onClick={props.onClose}
            class="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!content().trim() || submitting()}
            class="btn-primary min-w-[6rem]"
          >
            {submitting() ? '...' : 'Post Answer'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AnswerEditor;