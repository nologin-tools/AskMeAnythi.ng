import { Component, createSignal } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import Logo from '../components/Logo';
import Loading from '../components/Loading';
import { createSession } from '../lib/api';
import { setAdminToken } from '../lib/storage';

const Home: Component = () => {
  const navigate = useNavigate();
  const [creating, setCreating] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);

    try {
      const result = await createSession();
      setAdminToken(result.session.id, result.adminToken);
      navigate(`/s/${result.session.id}/admin`);
    } catch (err) {
      console.error('Failed to create session:', err);
      setError('Failed to create session. Please try again.');
      setCreating(false);
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
            <button
              onClick={handleCreate}
              disabled={creating()}
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
           <p class="font-mono text-xs">Designed for minimalism.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
