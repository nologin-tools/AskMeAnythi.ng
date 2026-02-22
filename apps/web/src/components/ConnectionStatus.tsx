import { Component } from 'solid-js';

interface ConnectionStatusProps {
  connected: boolean;
}

const ConnectionStatus: Component<ConnectionStatusProps> = (props) => {
  return (
    <div
      class="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300"
      classList={{
        'bg-green-100 text-green-700': props.connected,
        'bg-red-100 text-red-700': !props.connected,
      }}
    >
      <div
        class="w-2 h-2 rounded-full"
        classList={{
          'bg-green-500': props.connected,
          'bg-red-500 animate-pulse': !props.connected,
        }}
      />
      {props.connected ? 'Connected' : 'Connecting...'}
    </div>
  );
};

export default ConnectionStatus;
