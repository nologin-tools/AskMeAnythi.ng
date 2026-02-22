import { Component } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import Logo from '../components/Logo';

const SessionEnded: Component = () => {
  const navigate = useNavigate();

  return (
    <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div class="mb-8">
        <Logo size="lg" />
      </div>
      
      <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md w-full">
        <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
           🏁
        </div>

        <h1 class="text-2xl font-bold text-gray-900 mb-2">
          Session Ended
        </h1>

        <p class="text-gray-500 mb-8 leading-relaxed">
          This session has been ended by the host. Thanks for participating!
        </p>

        <button
          onClick={() => navigate('/')}
          class="w-full btn-primary py-3"
        >
          Start my own Session
          <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
      
      <footer class="mt-8 text-sm text-gray-400">
         askmeanythi.ng
      </footer>
    </div>
  );
};

export default SessionEnded;