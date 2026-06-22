'use client';

import { getUserColor, getInitials } from '@/lib/sunlit/colors';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg' | number; // プリセット or px
}

const sizes = { sm: 28, md: 36, lg: 56 };

export function Avatar({ name, size = 'md' }: AvatarProps) {
  const px = typeof size === 'number' ? size : sizes[size];
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-black flex-shrink-0"
      style={{ width: px, height: px, fontSize: px * 0.38, backgroundColor: getUserColor(name) }}
    >
      {getInitials(name)}
    </div>
  );
}
