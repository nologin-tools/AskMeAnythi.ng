import { Component, createSignal, Show, onCleanup } from 'solid-js';

interface ToastData {
  message: string;
  type: 'success' | 'error' | 'info';
}

const [toast, setToast] = createSignal<ToastData | null>(null);
let timeoutId: number | null = null;

export function showToast(message: string, type: ToastData['type'] = 'info', duration = 3000) {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  setToast({ message, type });

  timeoutId = window.setTimeout(() => {
    setToast(null);
    timeoutId = null;
  }, duration);
}

const typeStyles = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-gray-800',
};

const Toast: Component = () => {
  return (
    <Show when={toast()}>
      <div class="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
        <div class={`px-4 py-2 rounded-lg text-white text-sm shadow-lg ${typeStyles[toast()!.type]}`}>
          {toast()!.message}
        </div>
      </div>
    </Show>
  );
};

export default Toast;
