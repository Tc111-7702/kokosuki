'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { type UserResult } from '@/components/community-types';

export function UserAvatar({ user, size }: { user: { name: string; image: string | null }; size: number }) {
  if (user.image) {
    return <img src={user.image} alt={user.name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  }
  const colors = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444'];
  const bg = colors[user.name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: size * 0.42, flexShrink: 0 }}>
      {user.name[0]}
    </div>
  );
}

export function CommunitySearchBar({
  onSearch,
  onClear,
  searchActive,
}: {
  onSearch: (label: string, gachaIds: string[]) => void;
  onClear: () => void;
  searchActive: boolean;
}) {
  const router = useRouter();
  const [value,    setValue]    = useState('');
  const [gachaSug, setGachaSug] = useState<{ label: string; type: 'gacha' | 'genre'; imageUrl?: string | null }[]>([]);
  const [userSug,  setUserSug]  = useState<UserResult[]>([]);
  const [focused,  setFocused]  = useState(false);
  const [busy,     setBusy]     = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = (v: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!v.trim()) { setGachaSug([]); setUserSug([]); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const [gd, ud] = await Promise.all([
          fetch(`/api/gacha/search?q=${encodeURIComponent(v)}&suggest=1`).then(r => r.json()),
          fetch(`/api/users/search?q=${encodeURIComponent(v)}`).then(r => r.json()),
        ]);
        setGachaSug(gd.suggestions ?? []);
        setUserSug(ud.users ?? []);
      } catch {}
    }, 150);
  };

  // 検索実行を1本に統一（Enter / ガチャ候補クリック 共通）。
  // Twitter方式：Enter/実行は投稿(ガチャ・IP)のみ検索し、ユーザーは検索しない（候補経由で開く）。
  const runSearch = async (q: string) => {
    if (!q.trim() || busy) return;
    setValue(q);                       // Enter時は同値=no-op / 候補クリック時は入力欄へ反映
    setGachaSug([]); setUserSug([]);
    setBusy(true);
    try {
      const gd = await fetch(`/api/gacha/search?q=${encodeURIComponent(q)}`).then(r => r.json());
      onSearch(q, gd.gachaIds ?? []);
    } catch {} finally { setBusy(false); }
  };

  // ユーザー候補タップ → その場で直接プロフィールへ（Twitter方式・API再取得なし・曖昧さなし）
  const openProfile = (u: UserResult) => {
    setGachaSug([]); setUserSug([]);
    router.push(`/profile/${u.handle ?? u.id}`);
  };

  const handleClear = () => { setValue(''); setGachaSug([]); setUserSug([]); onClear(); };

  const showDrop = focused && (gachaSug.length > 0 || userSug.length > 0);

  return (
    <div className="relative">
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-full transition-all"
        style={{ background: '#F3F4F6', outline: focused ? '2px solid #FBBF24' : '2px solid transparent' }}
      >
        {busy ? (
          <div className="animate-spin rounded-full border-2 border-t-transparent" style={{ width: 15, height: 15, borderColor: '#F2B800', borderTopColor: 'transparent', flexShrink: 0 }} />
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="16.65" y1="16.65" x2="21" y2="21" />
          </svg>
        )}
        <input
          type="text"
          value={value}
          onChange={e => { setValue(e.target.value); fetchSuggestions(e.target.value); }}
          onFocus={() => { setFocused(true); if (value) fetchSuggestions(value); }}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          onKeyDown={e => e.key === 'Enter' && runSearch(value)}
          placeholder="アカウント / IP・ガチャの投稿を検索"
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: '#111', fontSize: 13, textAlign: 'left' }}
        />
        {(value || searchActive) && (
          <button onMouseDown={e => { e.preventDefault(); handleClear(); }} style={{ lineHeight: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {showDrop && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden" style={{ maxHeight: 300, overflowY: 'auto' }}>
          {userSug.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs font-bold text-gray-400 bg-gray-50 border-b border-gray-100">{'アカウント'}</div>
              {userSug.slice(0, 4).map(u => (
                <button key={u.id} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left border-b border-gray-50"
                  onMouseDown={e => { e.preventDefault(); openProfile(u); }}>
                  <UserAvatar user={u} size={32} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                    {u.handle && <p className="text-xs text-gray-400">@{u.handle}</p>}
                  </div>
                </button>
              ))}
            </>
          )}
          {gachaSug.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs font-bold text-gray-400 bg-gray-50 border-b border-gray-100">{'ガチャ・IP'}</div>
              {gachaSug.map((s, i) => (
                <button key={i} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0 text-left"
                  onMouseDown={e => { e.preventDefault(); runSearch(s.label); }}>
                  <span className="text-sm font-medium text-gray-800">{s.label}</span>
                  {s.type === 'genre' ? (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#DBEAFE', color: '#1D4ED8' }}>IP</span>
                  ) : s.imageUrl ? (
                    <img src={s.imageUrl} alt={s.label}
                      style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : null}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
