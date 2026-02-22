import { Component } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import Logo from '../components/Logo';

const NotFound: Component = () => {
  const navigate = useNavigate();

  return (
    <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div class="mb-8 scale-110">
         <Logo size="lg" />
      </div>

      <div class="text-center max-w-sm">
        <h1 class="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">
          404
        </h1>
        <h2 class="text-xl font-medium text-gray-900 mb-4">
          Page Not Found
        </h2>

        <p class="text-gray-500 mb-8">
          The page you're looking for may have been moved, deleted, or the link is incorrect.
        </p>

        <button
          onClick={() => navigate('/')}
          class="btn-secondary px-8"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default NotFound;