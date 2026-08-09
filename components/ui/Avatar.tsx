'use client';

import { useState } from 'react';

export function avatarColor(name: string): string {
  const colors = ['#F87171','#FB923C','#FBBF24','#34D399','#60A5FA','#818CF8','#E879F9','#F472B6'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}

export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return String(Math.floor(diff)) + '秒前';
  if (diff < 3600)  return String(Math.floor(diff / 60)) + '分前';
  if (diff < 86400) return String(Math.floor(diff / 3600)) + '時間前';
  return String(Math.floor(diff / 86400)) + '日前';
}

export function Avatar({ user, size = 40 }: { user: { name: string; image: string | null }; size?: number }) {
  // 画像URLが壊れている（404等）場合はそのURLを記録し、頭文字アバターにフォールバック
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const name = user.name || '?';

  if (user.image && user.image !== failedSrc) {
    return (
      // 任意ホスト（dicebear/Google/Supabase等）に対応するため next/image ではなく img を使用
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.image}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        onError={() => setFailedSrc(user.image)}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div
      className="flex-shrink-0 rounded-full flex items-center justify-center text-white font-bold"
      style={{ width: size, height: size, backgroundColor: avatarColor(name), fontSize: size * 0.35 }}
    >
      {name.charAt(0)}
    </div>
  );
}
