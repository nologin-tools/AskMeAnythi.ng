import { Component, createSignal, onMount, onCleanup } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import Logo from '../components/Logo';
import Loading from '../components/Loading';
import { createSession } from '../lib/api';
import { setAdminToken } from '../lib/storage';

// Turnstile site key — set via environment variable at build time
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

declare global {
  interface Window {
    turnstile?: {
      render: (element: string | HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        'expired-callback'?: () => void;
        'error-callback'?: () => void;
        theme?: 'light' | 'dark' | 'auto';
        size?: 'normal' | 'compact' | 'invisible';
      }) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const Home: Component = () => {
  const navigate = useNavigate();
  const [creating, setCreating] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [turnstileToken, setTurnstileToken] = createSignal<string | null>(null);
  let turnstileWidgetId: string | undefined;
  let turnstileContainer: HTMLDivElement | undefined;

  onMount(() => {
    if (!TURNSTILE_SITE_KEY) return;

    // Load Turnstile script
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
    script.async = true;

    (window as any).onTurnstileLoad = () => {
      if (turnstileContainer && window.turnstile) {
        turnstileWidgetId = window.turnstile.render(turnstileContainer, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => setTurnstileToken(token),
          'expired-callback': () => setTurnstileToken(null),
          'error-callback': () => setTurnstileToken(null),
          theme: 'light',
          size: 'normal',
        });
      }
    };

    document.head.appendChild(script);

    onCleanup(() => {
      if (turnstileWidgetId && window.turnstile) {
        window.turnstile.remove(turnstileWidgetId);
      }
      script.remove();
      delete (window as any).onTurnstileLoad;
    });
  });

  const handleCreate = async () => {
    if (TURNSTILE_SITE_KEY && !turnstileToken()) {
      setError('Please complete the verification first.');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const result = await createSession({
        turnstileToken: turnstileToken() || undefined,
      });
      setAdminToken(result.session.id, result.adminToken);
      navigate(`/s/${result.session.id}/admin`);
    } catch (err) {
      console.error('Failed to create session:', err);
      setError('Failed to create session. Please try again.');
      setCreating(false);
      // Reset turnstile on failure
      if (turnstileWidgetId && window.turnstile) {
        window.turnstile.reset(turnstileWidgetId);
        setTurnstileToken(null);
      }
    }
  };

  return (
    <div class="min-h-screen flex flex-col bg-white text-gray-900 font-sans selection:bg-black selection:text-white">
      {/* Header */}
      <header class="py-8 px-6 md:px-12 flex items-center justify-between">
        <Logo size="md" />
        <div></div>
      </header>

      {/* Main Content */}
      <main class="flex-1 flex flex-col items-center justify-center px-6 relative">
        <div class="max-w-4xl mx-auto text-center z-10">
          <div class="inline-flex items-center px-3 py-1 rounded-full bg-gray-50 border border-gray-100 text-xs font-medium text-gray-500 mb-8 animate-fade-in">
             <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>
             No registration required
          </div>
          
          <h1 class="text-6xl md:text-8xl font-bold tracking-tighter mb-8 leading-[1.1] animate-slide-up">
            Connect with your audience.
            <span class="block text-gray-400 font-light">Instantly.</span>
          </h1>

          <p class="text-xl md:text-2xl text-gray-500 font-light max-w-2xl mx-auto mb-12 leading-relaxed animate-slide-up" style={{ "animation-delay": "0.1s" }}>
            The simplest way to host an AMA session. <br class="hidden md:block"/>
            Create a space, share the link, and start answering.
          </p>

          <div class="flex flex-col items-center gap-4 animate-slide-up" style={{ "animation-delay": "0.2s" }}>
            {/* Turnstile verification widget */}
            {TURNSTILE_SITE_KEY && (
              <div ref={turnstileContainer} class="mb-2" />
            )}

            <button
              onClick={handleCreate}
              disabled={creating() || (!!TURNSTILE_SITE_KEY && !turnstileToken())}
              class="group h-14 px-8 rounded-full bg-black text-white text-lg font-medium hover:scale-105 hover:shadow-2xl transition-all duration-300 disabled:opacity-70 disabled:hover:scale-100 flex items-center gap-3"
            >
              {creating() ? (
                <>
                  <Loading size="sm" class="text-white opacity-50" />
                  <span>Creating Space...</span>
                </>
              ) : (
                <>
                  <span>Start a Session</span>
                  <svg class="w-5 h-5 group-hover:translate-x-1 transition-transform text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </>
              )}
            </button>
            {error() && (
              <p class="text-sm text-red-500 mt-2">{error()}</p>
            )}
          </div>
        </div>
        
        {/* Abstract decoration - extremely subtle */}
        <div class="absolute inset-0 z-0 overflow-hidden pointer-events-none">
           <div class="absolute top-[20%] left-[10%] w-[40vw] h-[40vw] bg-gray-50 rounded-full blur-[100px] opacity-60 mix-blend-multiply"></div>
           <div class="absolute bottom-[10%] right-[10%] w-[30vw] h-[30vw] bg-gray-50 rounded-full blur-[80px] opacity-60 mix-blend-multiply"></div>
        </div>
      </main>

      {/* Footer */}
      <footer class="py-12 text-center text-sm text-gray-400 border-t border-gray-50">
        <div class="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
           <p>© 2026 askmeanythi.ng</p>
           <div class="flex items-center gap-4">
             <a href="https://x.com/AskMeAnythi_ng" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-900 transition-colors" aria-label="X (Twitter)">
               <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
               <span class="text-xs">X</span>
             </a>
             <span class="text-gray-200">·</span>
             <a href="https://github.com/nologin-tools/AskMeAnythi.ng" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-900 transition-colors" aria-label="GitHub">
               <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
               <span class="text-xs">GitHub</span>
             </a>
             <span class="text-gray-200">·</span>
             <a href="https://github.com/nologin-tools/AskMeAnythi.ng/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-900 transition-colors text-xs font-medium" aria-label="MIT License">
               MIT
             </a>
             <span class="text-gray-200">·</span>
             <a href="/about" class="text-gray-400 hover:text-gray-900 transition-colors text-xs">About</a>
             <span class="text-gray-200">·</span>
             <a href="/faq" class="text-gray-400 hover:text-gray-900 transition-colors text-xs">FAQ</a>
             <span class="text-gray-200">·</span>
             <a href="/privacy" class="text-gray-400 hover:text-gray-900 transition-colors text-xs">Privacy</a>
             <span class="text-gray-200">·</span>
             <a href="/terms" class="text-gray-400 hover:text-gray-900 transition-colors text-xs">Terms</a>
           </div>
           <p class="font-mono text-xs">Designed for minimalism.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
