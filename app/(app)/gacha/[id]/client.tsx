'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Heart, MapPin, MessageCircle, Users, Bell, Sparkles, ChevronRight } from 'lucide-react';
import { useSunlit } from '@/lib/sunlit/store';
import { GACHA_ITEMS, getStatusLabel, getStatusStyle, getAnticipationVoices, ipGradient } from '@/lib/sunlit/gacha-data';
import { MOCK_FEED } from '@/lib/sunlit/mock-data';
import type { FeedItem } from '@/lib/sunlit/types';
import { Avatar } from '@/components/sunlit/ui/Avatar';

const KIND_LABEL: Record<string, string> = {
  gacha: 'ガチャ',
  kuji:  'くじ',
  other: 'その他',
};

const RESULT_CONFIG = {
  hit:       { label: '神引き', bg: '#FFFAE0', text: '#92620A', border: '#FFCD31', dot: '#FFCD31' },
  miss:      { label: '爆死',   bg: '#FFF1F1', text: '#C41E1E', border: '#FECACA', dot: '#EF4444' },
  duplicate: { label: 'ダブり', bg: '#EEF2FF', text: '#3730A3', border: '#C7D2FE', dot: '#818CF8' },
};

const STOCK_CONFIG = {
  in_stock:      { label: '在庫あり', bg: '#F0FDF4', text: '#15803D', dot: '#22C55E' },
  out_of_stock:  { label: '在庫なし', bg: '#FFF1F1', text: '#C41E1E', dot: '#EF4444' },
  not_available: { label: '取扱なし', bg: '#F5F5F4', text: '#78716C', dot: '#A8A29E' },
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return 'たった今';
  if (diff < 3600)  return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  return `${Math.floor(diff / 86400)}日前`;
}

function RelatedPullCard({ item, onTap }: { item: FeedItem; onTap?: () => void }) {
  const pull   = item.pull!;
  const cfg    = RESULT_CONFIG[pull.result];
  const hasImg = !!pull.imageUrl;
  return (
    <div className="mikke-feed-card flex items-center gap-3 px-3.5 py-3 active:scale-[0.99] transition-transform"
      role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={onTap}>
      {hasImg ? (
        <div className="w-14 h-14 rounded-xl flex-shrink-0"
          style={{ background: `linear-gradient(145deg, ${ipGradient(item.machine.ipName).from}, ${ipGradient(item.machine.ipName).to})` }} />
      ) : (
        <Avatar name={item.userName} size={32} />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[12px] font-bold text-[#111]">{item.userName}</span>
          <span className="text-[10px] text-[#AAA]">{timeAgo(item.createdAt)}</span>
        </div>
        {pull.itemName && (
          <p className="text-[12px] font-semibold text-[#555] truncate">{pull.itemName}</p>
        )}
        {pull.memo && (
          <p className="text-[11px] text-[#888] mt-0.5 line-clamp-2">{pull.memo}</p>
        )}
      </div>
      <div
        className="px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 flex-shrink-0 self-start"
        style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
      >
        <span className="w-1 h-1 rounded-full" style={{ background: cfg.dot }} />
        {cfg.label}
      </div>
    </div>
  );
}

function RelatedReportCard({ item, onTap }: { item: FeedItem; onTap?: () => void }) {
  const report = item.report!;
  const cfg    = STOCK_CONFIG[report.status];
  return (
    <div className="mikke-feed-card flex items-center gap-3 px-3.5 py-3 active:scale-[0.99] transition-transform"
      role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={onTap}>
      <Avatar name={item.userName} size={32} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[12px] font-bold text-[#111]">{item.userName}</span>
          <span className="text-[10px] text-[#AAA]">{timeAgo(item.createdAt)}</span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin size={10} color="#AAA" />
          <span className="text-[11px] text-[#888] truncate">{item.spot.name}</span>
        </div>
      </div>
      <span
        className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 flex-shrink-0"
        style={{ background: cfg.bg, color: cfg.text }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
        {cfg.label}
      </span>
    </div>
  );
}

function VoiceRow({ userName, text, time }: { userName: string; text: string; time: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Avatar name={userName} size={28} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[12px] font-bold text-[#111]">{userName}</span>
          <span className="text-[10px] text-[#AAA]">{time}</span>
        </div>
        <p className="text-[13px] text-[#444] leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

// 将来 page.tsx から環境変数・初期データを受け取る場合はここに追加
// interface GachaDetailClientProps { ... }

export default function GachaDetailClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const {
    likedGachaItemIds, toggleGachaLike, setHomeTab,
    rankings, toggleRank, userVoices, addVoice,
  } = useSunlit();

  const [excited, setExcited]     = useState(false);
  const [voiceText, setVoiceText] = useState('');

  const item = GACHA_ITEMS.find((g) => g.id === id);
  if (!item) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <p className="text-[14px] text-[#AAA]">ガチャが見つかりませんでした</p>
      <button onClick={() => router.back()} className="text-[13px] font-bold text-[#F2B800]">戻る</button>
    </div>
  );

  const liked        = likedGachaItemIds.has(item.id);
  const stCfg        = getStatusStyle(item.status);
  const stLabel      = getStatusLabel(item);
  const isComingSoon = item.status === 'coming_soon';

  const STOCK_FRESH_MS = 12 * 60 * 60 * 1000;
  const DETAIL_LIMIT   = 5;
  const now            = Date.now();
  const seriesFeed     = MOCK_FEED.filter((f) => f.machine.ipName === item.ipName);
  const pulls          = seriesFeed.filter((f) => f.type === 'pull');
  const freshReports   = (() => {
    const recent = seriesFeed.filter(
      (f) => f.type === 'report' && now - new Date(f.createdAt).getTime() <= STOCK_FRESH_MS,
    );
    const byKey = new Map<string, FeedItem>();
    for (const r of recent) {
      const key = `${r.spot.id}_${r.machine.id}`;
      const ex  = byKey.get(key);
      if (!ex || new Date(r.createdAt) > new Date(ex.createdAt)) byKey.set(key, r);
    }
    return [...byKey.values()];
  })();
  const mergedPosts  = [...pulls, ...freshReports]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const relatedPosts = mergedPosts.slice(0, DETAIL_LIMIT);
  const hasMorePosts = mergedPosts.length > DETAIL_LIMIT;

  const myVoices     = userVoices[item.id] ?? [];
  const voices       = isComingSoon ? [...myVoices, ...getAnticipationVoices(item.id)] : [];
  const excitedCount = item.commentCount + myVoices.length + (excited ? 1 : 0);
  const rank         = rankings[item.id] ?? [];

  const openCommunity = () => { setHomeTab('community'); router.push('/home'); };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#FFFEEF]">

      {/* ヒーロー */}
      <div
        className="relative flex-shrink-0"
        style={{ height: 248, background: `linear-gradient(150deg, ${item.gradientFrom} 0%, ${item.gradientTo} 100%)` }}
      >
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-6 pb-3">
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.28)' }}
            onClick={() => router.back()}
          >
            <ArrowLeft size={18} color="white" />
          </button>
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: liked ? 'rgba(255,77,77,0.85)' : 'rgba(0,0,0,0.28)' }}
            onClick={() => toggleGachaLike(item.id)}
          >
            <Heart size={18} fill={liked ? 'white' : 'none'} color="white" />
          </button>
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 px-5 pb-5 pt-16"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.52), transparent)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black"
              style={{ background: stCfg.bg, color: stCfg.text }}>{stLabel}</span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold"
              style={{ background: 'rgba(255,255,255,0.22)', color: 'white' }}>{KIND_LABEL[item.kind]}</span>
          </div>
          <p className="text-[12px] font-bold mb-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>{item.ipName}</p>
          <p className="text-[20px] font-black text-white leading-tight">{item.seriesName}</p>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 px-4 py-4 space-y-4">

        {isComingSoon ? (
          <button
            className="mikke-btn-yellow flex items-center justify-center gap-2"
            onClick={() => toggleGachaLike(item.id)}
          >
            <Bell size={16} />
            {liked ? '通知オン' : '発売をお知らせ'}
          </button>
        ) : (
          <button
            className="mikke-btn-yellow flex items-center justify-center gap-2"
            onClick={() => router.push('/map')}
          >
            <MapPin size={16} />
            近くにある？
          </button>
        )}

        {/* スタッツカード */}
        <div
          className="flex items-center rounded-2xl overflow-hidden"
          style={{ background: 'white', border: '1.5px solid #EDE9D8', boxShadow: '0 3px 0 #E5E1CE' }}
        >
          {(isComingSoon
            ? [
                { icon: null,                                 value: `¥${item.price}`,  label: '1回の価格' },
                { icon: <Sparkles size={12} color="#AAA" />, value: excitedCount,       label: '楽しみ' },
                { icon: <Bell size={12} color="#AAA" />,     value: '来週',             label: '発売' },
              ]
            : [
                { icon: null,                                      value: `¥${item.price}`,    label: '1回の価格' },
                { icon: <MessageCircle size={12} color="#AAA" />,  value: relatedPosts.length, label: '投稿' },
                { icon: <Users size={12} color="#AAA" />,          value: item.weeklyPulls,    label: '今週引いた' },
              ]
          ).map((stat, i) => (
            <div key={i} className="flex-1 text-center py-3.5"
              style={{ borderLeft: i > 0 ? '1px solid #EDE9D8' : 'none' }}>
              {stat.icon ? (
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  {stat.icon}
                  <p className="text-[18px] font-black text-[#111] leading-none">{stat.value}</p>
                </div>
              ) : (
                <p className="text-[18px] font-black text-[#111] leading-none">{stat.value}</p>
              )}
              <p className="text-[9px] text-[#AAA] font-bold mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ほしい順 */}
        {item.lineup && item.lineup.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5">
              <p className="text-[13px] font-black text-[#111]">ほしい順を選ぶ</p>
              {rank.length > 0 && (
                <span className="text-[11px] font-bold text-[#AAA]">{rank.length}/{item.lineup.length}</span>
              )}
            </div>
            <p className="text-[11px] text-[#999] leading-relaxed">
              ほしい順にタップ。引く前のワクワクを高めて、ダブったら交換にも使えます。
            </p>
            <div className="flex flex-wrap gap-2">
              {item.lineup.map((name) => {
                const idx    = rank.indexOf(name);
                const ranked = idx >= 0;
                return (
                  <button
                    key={name}
                    onClick={() => toggleRank(item.id, name)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-bold active:scale-95 transition-transform"
                    style={ranked
                      ? { background: '#FFCD31', color: '#7A4E00' }
                      : { background: 'white', color: '#555', border: '1.5px solid #EDE9D8' }}
                  >
                    {ranked && (
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black"
                        style={{ background: '#7A4E00', color: '#FFCD31' }}>
                        {idx + 1}
                      </span>
                    )}
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isComingSoon ? (
          <div className="space-y-3">
            <button
              onClick={() => setExcited((v) => !v)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 active:scale-[0.99] transition-transform"
              style={excited
                ? { background: '#FFCD31', color: '#7A4E00' }
                : { background: 'white', color: '#92620A', border: '1.5px solid #FFCD31' }}
            >
              <Sparkles size={16} fill={excited ? '#7A4E00' : 'none'} />
              <span className="text-[14px] font-black">{excited ? '楽しみにしてる！' : '楽しみ！'}</span>
              <span className="text-[12px] font-bold">{excitedCount}人</span>
            </button>

            <div className="flex items-center gap-2 rounded-2xl px-3 py-2"
              style={{ background: 'white', border: '1.5px solid #EDE9D8' }}>
              <input
                value={voiceText}
                onChange={(e) => setVoiceText(e.target.value)}
                placeholder="発売が楽しみな気持ちを一言…"
                className="flex-1 bg-transparent outline-none text-[13px] text-[#111] placeholder:text-[#BBB]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && voiceText.trim()) {
                    addVoice(item.id, voiceText);
                    setVoiceText('');
                  }
                }}
              />
              <button
                disabled={!voiceText.trim()}
                onClick={() => { addVoice(item.id, voiceText); setVoiceText(''); }}
                className="px-3 py-1.5 rounded-full text-[12px] font-black flex-shrink-0"
                style={voiceText.trim()
                  ? { background: '#FFCD31', color: '#7A4E00' }
                  : { background: '#F0ECD8', color: '#CCC' }}
              >
                送信
              </button>
            </div>

            <p className="text-[13px] font-black text-[#111]">楽しみにしている声</p>
            {voices.length > 0 ? (
              <div className="rounded-2xl px-4 py-4 space-y-4"
                style={{ background: 'white', border: '1.5px solid #EDE9D8' }}>
                {voices.map((v) => (
                  <VoiceRow key={v.id} userName={v.userName} text={v.text} time={timeAgo(v.createdAt)} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl px-4 py-5 text-center"
                style={{ background: 'white', border: '1.5px solid #EDE9D8' }}>
                <p className="text-[12px] font-bold text-[#CCC]">発売されたら、みんなの投稿がここに並びます</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-black text-[#111]">このシリーズのみんなの投稿</p>
              <button onClick={openCommunity}
                className="flex items-center gap-0.5 text-[11px] font-bold text-[#AAA]">
                みんなで見る <ChevronRight size={11} />
              </button>
            </div>
            {relatedPosts.length > 0 ? (
              <div className="space-y-2">
                {relatedPosts.map((post) =>
                  post.type === 'pull' && post.pull ? (
                    <RelatedPullCard key={post.id} item={post}
                      onTap={() => router.push(`/feed/${post.id}`)} />
                  ) : post.type === 'report' && post.report ? (
                    <RelatedReportCard key={post.id} item={post}
                      onTap={() => router.push(`/feed/${post.id}`)} />
                  ) : null
                )}
                {hasMorePosts && (
                  <button onClick={openCommunity}
                    className="w-full py-2.5 text-[12px] font-bold text-[#AAA] flex items-center justify-center gap-0.5">
                    すべての投稿を見る <ChevronRight size={12} />
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-2xl px-4 py-6 text-center"
                style={{ background: 'white', border: '1.5px solid #EDE9D8' }}>
                <p className="text-[13px] font-bold text-[#CCC]">まだ投稿がありません</p>
                <p className="text-[11px] text-[#DDD] mt-1">引いたら「引いた！」から記録して最初の投稿者になろう</p>
              </div>
            )}
          </div>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
