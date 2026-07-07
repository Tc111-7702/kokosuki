'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { type RecommendedUser } from '@/components/community-types';

export function RecommendedUserRow({ user, onFollowed }: { user: RecommendedUser; onFollowed: (id: string) => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      await fetch(`/api/users/${user.id}/follow`, { method: 'POST' });
      onFollowed(user.id);
    } catch {}
    setLoading(false);
  };

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', cursor: 'pointer' }}
      onClick={() => router.push(`/profile/${user.handle ?? user.id}`)}
    >
      {/* アバター */}
      <div style={{
        width: 38, height: 38, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
        background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {user.image
          ? <img src={user.image} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 16, color: '#9ca3af' }}>👤</span>
        }
      </div>
      {/* 名前・ハンドル */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.name}
        </div>
        <div style={{ fontSize: 11, color: '#888' }}>
          {user.handle ? `@${user.handle}` : ''}{user.handle && user.followerCount > 0 ? ' · ' : ''}
          {user.followerCount > 0 ? `フォロワー ${user.followerCount.toLocaleString()}` : ''}
        </div>
      </div>
      {/* フォローボタン */}
      <button
        onClick={handleFollow}
        disabled={loading}
        style={{
          flexShrink: 0,
          padding: '4px 12px',
          borderRadius: 20,
          border: '1.5px solid #FBBF24',
          background: '#FBBF24',
          color: '#fff',
          fontSize: 12,
          fontWeight: 600,
          cursor: loading ? 'default' : 'pointer',
          opacity: loading ? 0.6 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        {loading ? '…' : 'フォロー'}
      </button>
    </div>
  );
}
