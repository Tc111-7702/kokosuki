'use client';

import { useState } from 'react';
import { Settings, Heart } from 'lucide-react';
import { MOCK_USERS, CURRENT_USER_ID, MOCK_FEED } from '@/lib/sunlit/mock-data';
import { useSunlit } from '@/lib/sunlit/store';
import { GACHA_ITEMS, getStatusLabel, getStatusStyle } from '@/lib/sunlit/gacha-data';
import { SettingsScreen } from './SettingsScreen';
import { Avatar } from '../ui/Avatar';
import { PullCard, ReportCard } from '../ui/FeedCard';

type Tab = 'posts' | 'reports' | 'favorites';

const MY_BIO = '推しはハイキューとポケモン。近所のガチャは大体踏破。神引き報告します';

export function MyPageScreen() {
  const { likedGachaItemIds, selectGachaItem, selectFeedItem, toggleLike } = useSunlit();
  const user = MOCK_USERS.find((u) => u.id === CURRENT_USER_ID)!;
  const [tab, setTab] = useState<Tab>('posts');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const mine       = MOCK_FEED.filter((f) => f.userId === CURRENT_USER_ID);
  const myPulls    = mine.filter((f) => f.type === 'pull');
  const myReports  = mine.filter((f) => f.type === 'report');
  const hitCount   = myPulls.filter((f) => f.pull?.result === 'hit').length;
  const likesGot   = mine.reduce((sum, f) => sum + f.likeCount, 0);
  const favItems   = GACHA_ITEMS.filter((g) => likedGachaItemIds.has(g.id));

  const STATS = [
    { value: myPulls.length, label: '引いた',  color: '#111' },
    { value: hitCount,       label: '神引き',  color: '#D97706' },
    { value: likesGot,       label: 'いいね',  color: '#FF4D4D' },
    { value: myReports.length, label: '報告',  color: '#111' },
  ];

  const TABS: { key: Tab; label: string }[] = [
    { key: 'posts',     label: '投稿' },
    { key: 'reports',   label: '報告' },
    { key: 'favorites', label: 'お気に入り' },
  ];

  return (
    <div className="absolute inset-0 flex flex-col bg-[#FFFEEF]">

      {/* ── プロフィールヘッダー ── */}
      <div className="flex-shrink-0 bg-white" style={{ borderBottom: '1.5px solid #EDE9D8' }}>
        <div className="flex items-center justify-between px-5 pt-12 pb-2">
          <h1 className="font-black" style={{ fontSize: 22, letterSpacing: '-0.5px', color: '#F2B800' }}>マイページ</h1>
          <button onClick={() => setSettingsOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full active:scale-90 transition-transform"
            style={{ background: '#F5F2E8' }}>
            <Settings size={17} color="#888" />
          </button>
        </div>

        <div className="flex items-center gap-4 px-5 py-2">
          <div className="rounded-full flex-shrink-0" style={{ border: '3px solid #FFCD31', borderRadius: 999 }}>
            <Avatar name={user.name} size={62} />
          </div>
          <div className="min-w-0">
            <p className="text-[17px] font-black text-[#111] leading-tight">{user.name}</p>
            <p className="text-[12px] text-[#AAA] mt-0.5">@{user.name.toLowerCase()}</p>
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {user.favoriteIps.map((ip) => (
                <span key={ip} className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: '#FFF8D0', color: '#D97706' }}>{ip}</span>
              ))}
            </div>
          </div>
        </div>

        {/* 自己紹介 */}
        <p className="px-5 pb-1 text-[12px] text-[#666] leading-relaxed">{MY_BIO}</p>

        <div className="grid grid-cols-4 gap-2 px-4 py-3">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col items-center py-2.5 rounded-2xl" style={{ background: '#F7F5EE' }}>
              <p className="text-[20px] font-black leading-none" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[9px] text-[#AAA] mt-1 font-bold">{s.label}</p>
            </div>
          ))}
        </div>

        {/* タブ（X型） */}
        <div className="flex">
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className="flex-1 py-2.5 text-[13px] font-bold relative"
              style={{ color: tab === key ? '#F2B800' : '#AAA' }}>
              {label}
              {tab === key && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2"
                  style={{ width: 22, height: 2.5, background: '#FFCD31', borderRadius: 99 }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── タブコンテンツ ── */}
      <div className="flex-1 overflow-y-auto">

        {tab === 'posts' && (
          <div className="px-3 py-3 space-y-3">
            {myPulls.length === 0 ? (
              <Empty text="まだ投稿がありません" sub="引いたらここに記録されます" />
            ) : (
              myPulls.map((item) => (
                <PullCard key={item.id} item={item} onLike={() => toggleLike(item.id)} onTap={() => selectFeedItem(item.id)} />
              ))
            )}
            {/* 行動シード：図鑑はPhase2で育つ（控えめ予告） */}
            <p className="text-[11px] text-[#BBB] text-center pt-2 flex items-center justify-center gap-1">
              <Heart size={11} color="#D8D3C4" />引いた投稿は、いつか“図鑑”に育ちます
            </p>
          </div>
        )}

        {tab === 'reports' && (
          <div className="px-3 py-3 space-y-3">
            {myReports.length === 0 ? (
              <Empty text="まだ報告がありません" sub="近くのスポットで在庫を報告しよう" />
            ) : (
              myReports.map((item) => (
                <ReportCard key={item.id} item={item} onLike={() => toggleLike(item.id)} onTap={() => selectFeedItem(item.id)} />
              ))
            )}
          </div>
        )}

        {tab === 'favorites' && (
          favItems.length === 0 ? (
            <Empty text="まだお気に入りがありません" sub="新着でハートして集めよう" />
          ) : (
            <>
              {/* アイデンティティ枠：好きなシリーズ・公開（管理はホーム側で） */}
              <div className="flex items-center justify-between px-5 pt-3 pb-1">
                <p className="text-[12px] font-bold text-[#888]">好きなシリーズ {favItems.length}</p>
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#AAA]">
                  <Heart size={11} color="#D8D3C4" />プロフィールに公開中
                </span>
              </div>
            <div className="grid grid-cols-2 gap-3 px-4 py-3">
              {favItems.map((g) => {
                const stCfg = getStatusStyle(g.status);
                return (
                  <div key={g.id} onClick={() => selectGachaItem(g.id)}
                    className="relative rounded-[18px] overflow-hidden active:scale-[0.97] transition-transform"
                    style={{ aspectRatio: '3/4', cursor: 'pointer' }}>
                    <div className="absolute inset-0" style={{ background: `linear-gradient(150deg, ${g.gradientFrom}, ${g.gradientTo})` }} />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black"
                      style={{ background: stCfg.bg, color: stCfg.text }}>{getStatusLabel(g)}</span>
                    <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5 pt-8"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)' }}>
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

      {settingsOpen && <SettingsScreen onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function Empty({ text, sub }: { text: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-1">
      <p className="text-[14px] font-bold text-[#CCC]">{text}</p>
      <p className="text-[11px] text-[#DDD]">{sub}</p>
    </div>
  );
}
