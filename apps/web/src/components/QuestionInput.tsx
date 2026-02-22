import { Component, createSignal, Show } from 'solid-js';
import Avatar from './Avatar';
import { getVisitorId } from '../lib/storage';
import { MAX_QUESTION_LENGTH } from '@askmeanything/shared';

interface QuestionInputProps {
  onSubmit: (content: string, authorName?: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

const QuestionInput: Component<QuestionInputProps> = (props) => {
  const [content, setContent] = createSignal('');
  const [authorName, setAuthorName] = createSignal('');
  const [submitting, setSubmitting] = createSignal(false);
  const [isExpanded, setIsExpanded] = createSignal(false);

  const visitorId = getVisitorId();

  const handleSubmit = async () => {
    const text = content().trim();
    if (!text || submitting()) return;

    setSubmitting(true);
    try {
      await props.onSubmit(text, authorName().trim() || undefined);
      setContent('');
      setIsExpanded(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div class="px-4 pb-6">
      <div 
        class="max-w-2xl mx-auto bg-white rounded-[2rem] shadow-float border border-gray-100 transition-all duration-300 overflow-hidden"
        classList={{
          'p-2': !isExpanded(),
          'p-4': isExpanded()
        }}
      >
        <div class="flex items-start gap-3">
           <Show when={isExpanded()}>
              <div class="pt-2 pl-1 animate-fade-in">
                 <Avatar seed={visitorId} size={32} class="rounded-full opacity-80" />
              </div>
           </Show>
           
           <div class="flex-1">
              <Show when={isExpanded()}>
                 <input
                    type="text"
                    value={authorName()}
                    onInput={(e) => setAuthorName(e.currentTarget.value)}
                    placeholder="Your Name (Optional)"
                    class="w-full text-xs font-medium text-gray-500 placeholder-gray-300 mb-2 bg-transparent focus:outline-none px-1"
                  />
              </Show>
              
              <div class="relative flex items-center">
                 <textarea
                    value={content()}
                    onInput={(e) => setContent(e.currentTarget.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsExpanded(true)}
                    placeholder={props.placeholder || "Ask a question..."}
                    disabled={props.disabled || submitting()}
                    maxLength={MAX_QUESTION_LENGTH}
                    rows={1}
                    class="w-full bg-transparent border-none focus:ring-0 text-base text-gray-900 placeholder-gray-400 resize-none py-3 px-1 min-h-[48px]"
                    style={{ 'field-sizing': 'content', 'max-height': '160px' }}
                  />
                  
                  <Show when={content().length > MAX_QUESTION_LENGTH * 0.8}>
                    <span
                      class="absolute right-14 bottom-2 text-xs tabular-nums"
                      classList={{
                        'text-gray-400': content().length <= MAX_QUESTION_LENGTH * 0.9,
                        'text-amber-500': content().length > MAX_QUESTION_LENGTH * 0.9 && content().length < MAX_QUESTION_LENGTH,
                        'text-red-500': content().length >= MAX_QUESTION_LENGTH,
                      }}
                    >
                      {content().length}/{MAX_QUESTION_LENGTH}
                    </span>
                  </Show>

                  <button
                    onClick={handleSubmit}
                    disabled={!content().trim() || props.disabled || submitting()}
                    class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ml-2"
                    classList={{
                       'bg-black text-white hover:scale-105': content().trim().length > 0 && !submitting(),
                       'bg-gray-100 text-gray-300': !content().trim() || submitting()
                    }}
                  >
                     <Show when={!submitting()} fallback={<div class="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"/>}>
                        <svg class="w-5 h-5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M12 5l7 7-7 7" /></svg>
                     </Show>
                  </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionInput;
