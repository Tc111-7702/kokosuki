'use client';

import { Heart } from 'lucide-react';

export function TrendingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #f3f3f0' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{title}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

export function TrendingRow({ rank, avatar, title, subtitle, likeCount, onClick }: {
  rank: number; avatar: React.ReactNode; title: string; subtitle?: string; likeCount: number; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLDivElement).style.background = '#fafaf8'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
    >
      <span style={{ width: 18, fontSize: 13, fontWeight: 700, color: '#FBBF24', flexShrink: 0, textAlign: 'center' }}>
        {rank}
      </span>
      {avatar}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 11, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {subtitle}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
        <Heart size={12} color="#F87171" fill="#F87171" />
        <span style={{ fontSize: 12, color: '#888' }}>{likeCount.toLocaleString()}</span>
      </div>
    </div>
  );
}
