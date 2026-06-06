'use client';

import { useState } from 'react';
import { ArrowLeft, Heart } from 'lucide-react';
import { useSunlit } from '@/lib/sunlit/store';
import { MOCK_USERS, MOCK_FEED, CURRENT_USER_ID } from '@/lib/sunlit/mock-data';
import { GACHA_ITEMS, getStatusLabel, getStatusStyle } from '@/lib/sunlit/gacha-data';
import { Avatar } from '../ui/Avatar';
import { PullCard, ReportCard } from '../ui/FeedCard';

type Tab = 'posts' | 'reports' | 'favorites';

function Empty({ text }: { text: string }) {
  return <div className="py-16 text-center"><p className="text-[14px] font-bold text-[#CCC]">{text}</p></div>;
}

export function UserProfileScreen() {
  const { selectedUserId, goBack, selectGachaItem, selectFeedItem, toggleLike } = useSunlit();
  const [tab, setTab] = useState<Tab>('posts');
  const user = MOCK_USERS.find((u) => u.id === selectedUserId);
  if (!user) return null;

  const isSelf     = user.id === CURRENT_USER_ID;
  const mine       = MOCK_FEED.filter((f) => f.userId === user.id);
  const myPulls    = mine.filter((f) => f.type === 'pull');
  const myReports  = mine.filter((f) => f.type === 'report');
  const hitCount   = myPulls.filter((f) => f.pull?.result === 'hit').length;
  const likesGot   = mine.reduce((s, f) => s + f.likeCount, 0);
  // 他人の「好きなシリーズ」は公開プロフィールの favoriteIps から（公開設定の対象）
  const favSeries  = GACHA_ITEMS.filter((g) => user.favoriteIps.includes(g.ipName));

  const STATS = [
    { value: myPulls.length, label: '引いた', color: '#111' },
    { value: hitCount,       label: '神引き', color: '#D97706' },
    { value: likesGot,       label: 'いいね', color: '#FF4D4D' },
    { value: myReports.length, label: '報告', color: '#111' },
  ];
  const TABS: { key: Tab; label: string }[] = [
    { key: 'posts', label: '投稿' }, { key: 'reports', label: '報告' }, { key: 'favorites', label: '好きなシリーズ' },
  ];

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#FFFEEF]">
      {/* ヘッダー */}
      <div className="flex-shrink-0 bg-white" style={{ borderBottom: '1.5px solid #EDE9D8' }}>
        <div className="flex items-center gap-3 px-4 pt-12 pb-2">
          <button onClick={goBack} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#F5F2E8' }}>
            <ArrowLeft size={18} color="#111" />
          </button>
          <p className="text-[16px] font-black text-[#111]">{user.name}</p>
        </div>

        <div className="flex items-center gap-4 px-5 py-2">
          <Avatar name={user.name} size={62} />
          <div className="min-w-0">
            <p className="text-[17px] font-black text-[#111] leading-tight">{user.name}{isSelf && <span className="text-[11px] text-[#AAA] ml-1.5">（あなた）</span>}</p>
            <p className="text-[12px] text-[#AAA] mt-0.5">@{user.name.toLowerCase()}</p>
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {user.favoriteIps.map((ip) => (
                <span key={ip} className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: '#FFF8D0', color: '#D97706' }}>{ip}</span>
              ))}
            </div>
          </div>
        </div>
        {user.bio && <p className="px-5 pb-1 text-[12px] text-[#666] leading-relaxed">{user.bio}</p>}

        <div className="grid grid-cols-4 gap-2 px-4 py-3">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col items-center py-2.5 rounded-2xl" style={{ background: '#F7F5EE' }}>
              <p className="text-[20px] font-black leading-none" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[9px] text-[#AAA] mt-1 font-bold">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex">
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)} className="flex-1 py-2.5 text-[13px] font-bold relative" style={{ color: tab === key ? '#F2B800' : '#AAA' }}>
              {label}
              {tab === key && <div className="absolute bottom-0 left-1/2 -translate-x-1/2" style={{ width: 22, height: 2.5, background: '#FFCD31', borderRadius: 99 }} />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'posts' && (
          <div className="px-3 py-3 space-y-3">
            {myPulls.length === 0 ? <Empty text="まだ投稿がありません" /> : myPulls.map((item) => (
              <PullCard key={item.id} item={item} onLike={() => toggleLike(item.id)} onTap={() => selectFeedItem(item.id)} />
            ))}
          </div>
        )}

        {tab === 'reports' && (
          <div className="px-3 py-3 space-y-3">
            {myReports.length === 0 ? <Empty text="まだ報告がありません" /> : myReports.map((item) => (
              <ReportCard key={item.id} item={item} onLike={() => toggleLike(item.id)} onTap={() => selectFeedItem(item.id)} />
            ))}
          </div>
        )}

        {tab === 'favorites' && (
          favSeries.length === 0 ? <Empty text="公開しているお気に入りはありません" /> : (
            <>
              <div className="flex items-center gap-1 px-5 pt-3 pb-1 text-[12px] font-bold text-[#888]">
                <Heart size={11} color="#D8D3C4" />好きなシリーズ {favSeries.length}
              </div>
              <div className="grid grid-cols-2 gap-3 px-4 py-3">
                {favSeries.map((g) => {
                  const stCfg = getStatusStyle(g.status);
                  return (
                    <div key={g.id} onClick={() => selectGachaItem(g.id)} className="relative rounded-[18px] overflow-hidden active:scale-[0.97] transition-transform" style={{ aspectRatio: '3/4', cursor: 'pointer' }}>
                      <div className="absolute inset-0" style={{ background: `linear-gradient(150deg, ${g.gradientFrom}, ${g.gradientTo})` }} />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black" style={{ background: stCfg.bg, color: stCfg.text }}>{getStatusLabel(g)}</span>
                      <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5 pt-8" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)' }}>
                        <p className="text-[9px] font-bold mb-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>{g.ipName}</p>
                        <p className="text-[11px] font-black text-white leading-tight line-clamp-2">{g.seriesName}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )
        )}
        <div className="h-4" />
      </div>
    </div>
  );
}
