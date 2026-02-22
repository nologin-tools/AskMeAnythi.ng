import { Component } from 'solid-js';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  class?: string;
}

const sizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

const Loading: Component<LoadingProps> = (props) => {
  const size = () => props.size || 'md';

  return (
    <div class={`flex items-center justify-center ${props.class || ''}`}>
      <svg
        class={`animate-spin text-primary-600 ${sizes[size()]}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};

export default Loading;

// 全屏加载
export const FullPageLoading: Component = () => {
  return (
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
      <Loading size="lg" />
    </div>
  );
};
