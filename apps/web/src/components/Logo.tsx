import { Component } from 'solid-js';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-4xl',
};

const Logo: Component<LogoProps> = (props) => {
  const size = () => props.size || 'md';

  return (
    <a href="/" class="group flex items-center gap-2 select-none">
      <div class={`font-bold tracking-tighter text-gray-900 ${sizes[size()]}`}>
        AskMe<span class="text-gray-400 font-light">Anything</span>
        <span class="text-orange-500 text-xs align-top ml-0.5">•</span>
      </div>
    </a>
  );
};

export default Logo;
