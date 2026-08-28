'use client';

import { useRouter } from 'next/navigation';
import { type RecommendedUser } from '@/components/community-types';

export function RecommendedUserRow({ user }: { user: RecommendedUser }) {
  const router = useRouter();

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', cursor: 'pointer' }}
      onClick={() => router.push(`/mypage/${user.id}`)}
    >
      <div style={{
        width: 38, height: 38, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
        background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {user.image
          ? <img src={user.image} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 16, color: '#9ca3af' }}>👤</span>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.name}
        </div>
        {user.handle && (
          <div style={{ fontSize: 11, color: '#888' }}>@{user.handle}</div>
        )}
      </div>
    </div>
  );
}
