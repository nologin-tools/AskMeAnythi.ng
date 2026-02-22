import { Component, createMemo } from 'solid-js';
import { generateHashAvatarDataUrl } from '@askmeanything/shared';

interface AvatarProps {
  seed: string;
  size?: number;
  class?: string;
}

const Avatar: Component<AvatarProps> = (props) => {
  const size = () => props.size || 40;

  const avatarUrl = createMemo(() => {
    return generateHashAvatarDataUrl(props.seed, size());
  });

  return (
    <img
      src={avatarUrl()}
      alt="Avatar"
      class={`rounded-xl object-cover bg-gray-100 ${props.class || ''}`}
      style={{ width: `${size()}px`, height: `${size()}px` }}
    />
  );
};

export default Avatar;