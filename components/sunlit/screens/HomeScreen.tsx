'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Heart, MapPin, Flag, ChevronRight,
  Users, X, Bell, ArrowLeft, Sparkles, Search,
} from 'lucide-react';
import { useSunlit } from '@/lib/sunlit/store';
import type { FeedItem } from '@/lib/sunlit/types';
import { GACHA_ITEMS, getStatusLabel, getStatusStyle, ipGradient } from '@/lib/sunlit/gacha-data';
import type { GachaItem } from '@/lib/sunlit/gacha-data';
import { MOCK_NOTIFICATIONS } from '@/lib/sunlit/mock-data';
import type { AppNotification } from '@/lib/sunlit/mock-data';
import { Avatar } from '../ui/Avatar';
import { PullCard, ReportCard } from '../ui/FeedCard';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

/* ヒーロー枠のモード（優先度カスケード／すべて裏付けのあるデータのみ）
   new=推しの新作 / upcoming=来週から / trending=話題
   ※「締切カウントダウン」は信頼できるデータが取れないため不採用。
     Phase2でUGC発の「残りわずか」シグナルとして別途設計する */
type HeroMode   = 'new' | 'upcoming' | 'trending';

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return 'たった今';
  if (diff < 3600)  return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  return `${Math.floor(diff / 86400)}日前`;
}

/* カード共通の熱量行：発売中=引いた人数 / 発売前=楽しみ人数（💬コメントは廃止） */
function HeatRow({ item }: { item: GachaItem }) {
  const c = 'rgba(255,255,255,0.7)';
  return (
    <div className="flex items-center gap-1 mt-1.5">
      {item.status === 'coming_soon' ? (
        <>
          <Sparkles size={9} color={c} />
          <span className="text-[9px] font-bold" style={{ color: c }}>{item.commentCount} 楽しみ</span>
        </>
      ) : (
        <>
          <Users size={9} color={c} />
          <span className="text-[9px] font-bold" style={{ color: c }}>{item.weeklyPulls} 引いた</span>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Layer B — 新着カード（横スクロール用）
───────────────────────────────────────────── */

function GachaCard({
  item, liked, onToggleLike, onTap,
}: { item: GachaItem; liked: boolean; onToggleLike: () => void; onTap: () => void }) {
  const stCfg   = getStatusStyle(item.status);
  const stLabel = getStatusLabel(item);
  return (
    <div
      className="flex-shrink-0 relative rounded-[18px] overflow-hidden active:scale-95 transition-transform"
      style={{ width: 132, height: 188, cursor: 'pointer' }}
      onClick={onTap}
    >
      <div className="absolute inset-0"
        style={{ background: `linear-gradient(150deg, ${item.gradientFrom} 0%, ${item.gradientTo} 100%)` }} />

      <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-2.5">
        <span className="px-2 py-0.5 rounded-full text-[9px] font-black"
          style={{ background: stCfg.bg, color: stCfg.text }}>
          {stLabel}
        </span>
        <button
          className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'rgba(0,0,0,0.28)' }}
          onClick={(e) => { e.stopPropagation(); onToggleLike(); }}
        >
          <Heart size={13} fill={liked ? '#FF4D4D' : 'none'} color={liked ? '#FF4D4D' : 'white'} />
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5 pt-10"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)' }}>
        <p className="text-[9px] font-bold mb-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
          {item.ipName}
        </p>
        <p className="text-[11px] font-black text-white leading-tight line-clamp-2">{item.seriesName}</p>
        <HeatRow item={item} />
      </div>
    </div>
  );
}

function GachaSection({
  title, badge, items, likedIds, onToggleLike, onTap, onSeeAll,
}: {
  title: string; badge?: string; items: GachaItem[];
  likedIds: Set<string>; onToggleLike: (id: string) => void; onTap: (id: string) => void;
  onSeeAll?: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <p className="text-[14px] font-black text-[#111]">{title}</p>
          {badge && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black"
              style={{ background: '#FFF7ED', color: '#C2410C' }}>{badge}</span>
          )}
        </div>
        <button onClick={onSeeAll} className="flex items-center gap-0.5 text-[11px] font-bold text-[#AAA]">
          すべて見る <ChevronRight size={11} />
        </button>
      </div>
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide px-4 pb-1">
        {items.map((item) => (
          <GachaCard key={item.id} item={item}
            liked={likedIds.has(item.id)}
            onToggleLike={() => onToggleLike(item.id)}
            onTap={() => onTap(item.id)} />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ランキング版セクション（Top○・社会的証明）
───────────────────────────────────────────── */

function RankedGachaSection({
  title, items, likedIds, onToggleLike, onTap, onSeeAll,
}: {
  title: string; items: GachaItem[];
  likedIds: Set<string>; onToggleLike: (id: string) => void; onTap: (id: string) => void;
  onSeeAll?: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-4">
        <p className="text-[14px] font-black text-[#111]">{title}</p>
        <button onClick={onSeeAll} className="flex items-center gap-0.5 text-[11px] font-bold text-[#AAA]">
          すべて見る <ChevronRight size={11} />
        </button>
      </div>
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide px-4 pb-1">
        {items.map((item, i) => (
          <div key={item.id} className="flex items-end flex-shrink-0" style={{ height: 188 }}>
            {/* 大きいランク数字（カード左に全体を見せる） */}
            <span
              className="font-black select-none pointer-events-none text-center"
              style={{
                fontSize: 76, lineHeight: 0.82, fontStyle: 'italic',
                color: '#FFCD31', WebkitTextStroke: '2.5px #E0A400',
                minWidth: 40, marginRight: -4, paddingBottom: 6,
              }}
            >
              {i + 1}
            </span>
            <GachaCard item={item}
              liked={likedIds.has(item.id)}
              onToggleLike={() => onToggleLike(item.id)}
              onTap={() => onTap(item.id)} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   アンビエント鼓動バー（新着上部の「人の気配」）
   みんなの最新の動きを数秒ごとに切り替えて流す。タップでみんなタブへ
───────────────────────────────────────────── */

function AmbientPulse({ messages, onTap }: { messages: string[]; onTap: () => void }) {
  const [idx, setIdx]   = useState(0);
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (messages.length <= 1) return;
    const t = setInterval(() => {
      setShow(false);
      setTimeout(() => { setIdx((i) => (i + 1) % messages.length); setShow(true); }, 250);
    }, 3500);
    return () => clearInterval(t);
  }, [messages.length]);

  if (messages.length === 0) return null;

  return (
    <div className="px-4 pt-3">
      <button
        onClick={onTap}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-full active:scale-[0.99] transition-transform"
        style={{ background: 'white', border: '1px solid #F0ECD8' }}
      >
        {/* ライブドット（点滅） */}
        <span className="relative flex-shrink-0 w-2 h-2">
          <span className="absolute inset-0 rounded-full animate-ping" style={{ background: '#22C55E', opacity: 0.55 }} />
          <span className="absolute inset-0 rounded-full" style={{ background: '#22C55E' }} />
        </span>
        <span
          className="flex-1 text-left text-[12px] font-bold text-[#555] truncate"
          style={{ opacity: show ? 1 : 0, transition: 'opacity 250ms ease' }}
        >
          {messages[idx]}
        </span>
        <ChevronRight size={14} color="#CCC" />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ヒーローカード（今週のハイライト）
───────────────────────────────────────────── */

function heroCopy(item: GachaItem, mode: HeroMode): { eyebrow: string; headline: string } {
  switch (mode) {
    case 'new':
      return { eyebrow: 'あなたの推しに新作', headline: `${item.ipName}、もう引いた？` };
    case 'upcoming':
      return { eyebrow: '来週から',           headline: `来週、${item.ipName}が出る` };
    case 'trending':
    default:
      return { eyebrow: '今週のハイライト',   headline: `今、${item.ipName}が熱い` };
  }
}

function HeroCard({
  item, mode, liked, onToggleLike, onTap,
}: {
  item: GachaItem; mode: HeroMode; liked: boolean;
  onToggleLike: () => void; onTap: () => void;
}) {
  const { eyebrow, headline } = heroCopy(item, mode);
  const isUpcoming = mode === 'upcoming';

  return (
    <div className="px-4">
      <div
        className="relative rounded-[24px] overflow-hidden active:scale-[0.98] transition-transform"
        style={{ height: 248, cursor: 'pointer' }}
        onClick={onTap}
      >
        {/* 背景グラデ */}
        <div className="absolute inset-0"
          style={{ background: `linear-gradient(145deg, ${item.gradientFrom} 0%, ${item.gradientTo} 100%)` }} />

        {/* 上部：eyebrow + ハート */}
        <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-4">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-black"
            style={{ background: 'rgba(255,255,255,0.92)', color: '#92620A' }}>
            {eyebrow}
          </span>
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: 'rgba(0,0,0,0.3)' }}
            onClick={(e) => { e.stopPropagation(); onToggleLike(); }}
          >
            <Heart size={17} fill={liked ? '#FF4D4D' : 'none'} color={liked ? '#FF4D4D' : 'white'} />
          </button>
        </div>

        {/* 下部：見出し + 商品名 + 熱量/予告 + CTA */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-16"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)' }}>
          <p className="text-[20px] font-black text-white leading-tight mb-1">{headline}</p>
          <p className="text-[12px] font-bold mb-2.5" style={{ color: 'rgba(255,255,255,0.78)' }}>
            {item.seriesName}
          </p>

          <div className="flex items-center justify-between">
            {/* 左：予告は発売週、それ以外は熱量 */}
            {isUpcoming ? (
              <span className="text-[12px] font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {item.startWeekLabel}
              </span>
            ) : (
              <div className="flex items-center gap-1">
                <Users size={11} color="rgba(255,255,255,0.7)" />
                <span className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {item.weeklyPulls}人が引いた
                </span>
              </div>
            )}

            {/* 右：予告は通知CTA（実アクション）。それ以外はカード全体→詳細なので控えめな誘導のみ */}
            {isUpcoming ? (
              <button
                className="flex items-center gap-1 px-3 py-1.5 rounded-full active:scale-95 transition-transform"
                style={{ background: 'rgba(255,255,255,0.95)' }}
                onClick={(e) => { e.stopPropagation(); onToggleLike(); }}
              >
                <Bell size={12} color="#111" />
                <span className="text-[12px] font-black" style={{ color: '#111' }}>
                  {liked ? '通知オン' : '発売をお知らせ'}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-0.5">
                <span className="text-[12px] font-black" style={{ color: 'rgba(255,255,255,0.92)' }}>詳しく見る</span>
                <ChevronRight size={14} color="rgba(255,255,255,0.92)" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   「すべて見る」一覧オーバーレイ
───────────────────────────────────────────── */

function GridCard({
  item, liked, onToggleLike, onTap,
}: { item: GachaItem; liked: boolean; onToggleLike: () => void; onTap: () => void }) {
  const stCfg   = getStatusStyle(item.status);
  const stLabel = getStatusLabel(item);
  return (
    <div
      className="relative rounded-[18px] overflow-hidden active:scale-[0.97] transition-transform"
      style={{ aspectRatio: '3/4', cursor: 'pointer' }}
      onClick={onTap}
    >
      <div className="absolute inset-0"
        style={{ background: `linear-gradient(150deg, ${item.gradientFrom} 0%, ${item.gradientTo} 100%)` }} />
      <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
        <span className="px-2 py-0.5 rounded-full text-[9px] font-black"
          style={{ background: stCfg.bg, color: stCfg.text }}>{stLabel}</span>
        <button
          className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'rgba(0,0,0,0.28)' }}
          onClick={(e) => { e.stopPropagation(); onToggleLike(); }}
        >
          <Heart size={12} fill={liked ? '#FF4D4D' : 'none'} color={liked ? '#FF4D4D' : 'white'} />
        </button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5 pt-10"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)' }}>
        <p className="text-[9px] font-bold mb-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>{item.ipName}</p>
        <p className="text-[11px] font-black text-white leading-tight line-clamp-2">{item.seriesName}</p>
        <HeatRow item={item} />
      </div>
    </div>
  );
}

function SegmentListOverlay({
  title, items, likedIds, onToggleLike, onTap, onClose,
}: {
  title: string; items: GachaItem[];
  likedIds: Set<string>; onToggleLike: (id: string) => void; onTap: (id: string) => void; onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#FFFEEF]">
      <div className="flex-shrink-0 bg-white flex items-center gap-3 px-4 pt-12 pb-3"
        style={{ borderBottom: '1.5px solid #EDE9D8' }}>
        <button onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: '#F5F0E0' }}>
          <ArrowLeft size={18} color="#111" />
        </button>
        <p className="text-[16px] font-black text-[#111]">{title}</p>
        <span className="text-[12px] font-bold text-[#AAA]">{items.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3 px-4 py-4">
          {items.map((item) => (
            <GridCard key={item.id} item={item}
              liked={likedIds.has(item.id)}
              onToggleLike={() => onToggleLike(item.id)}
              onTap={() => onTap(item.id)} />
          ))}
        </div>
        <div className="h-4" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   検索オーバーレイ（IP・シリーズ名）
───────────────────────────────────────────── */

const SUGGEST_IPS = ['ポケモン', 'ワンピース', 'ちいかわ', 'サンリオ', '呪術廻戦', 'ハイキュー!!'];

function SearchOverlay({
  likedIds, onToggleLike, onTap, onClose,
}: {
  likedIds: Set<string>; onToggleLike: (id: string) => void; onTap: (id: string) => void; onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const query   = q.trim();
  const results = query
    ? GACHA_ITEMS.filter((g) => g.seriesName.includes(query) || g.ipName.includes(query))
    : [];

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#FFFEEF]">
      {/* 検索ヘッダー */}
      <div className="flex-shrink-0 bg-white flex items-center gap-2 px-4 pt-12 pb-3"
        style={{ borderBottom: '1.5px solid #EDE9D8' }}>
        <button onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
          style={{ background: '#F5F0E0' }}>
          <ArrowLeft size={18} color="#111" />
        </button>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: '#F5F0E0' }}>
          <Search size={15} color="#999" />
          <input
            autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="ガチャ・IPを検索"
            className="flex-1 bg-transparent outline-none text-[14px] text-[#111] placeholder:text-[#AAA]"
          />
          {q && (
            <button onClick={() => setQ('')}><X size={14} color="#999" /></button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!query ? (
          <div className="px-4 py-5">
            <p className="text-[12px] font-bold text-[#AAA] mb-3">人気のIP</p>
            <div className="flex flex-wrap gap-2">
              {SUGGEST_IPS.map((ip) => (
                <button key={ip} onClick={() => setQ(ip)}
                  className="px-3.5 py-2 rounded-full text-[13px] font-bold active:scale-95 transition-transform"
                  style={{ background: 'white', border: '1.5px solid #EDE9D8', color: '#555' }}>
                  {ip}
                </button>
              ))}
            </div>
          </div>
        ) : results.length > 0 ? (
          <>
            <p className="px-4 pt-4 pb-1 text-[12px] font-bold text-[#AAA]">{results.length}件</p>
            <div className="grid grid-cols-2 gap-3 px-4 py-3">
              {results.map((item) => (
                <GridCard key={item.id} item={item}
                  liked={likedIds.has(item.id)}
                  onToggleLike={() => onToggleLike(item.id)}
                  onTap={() => onTap(item.id)} />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center py-16 gap-2">
            <p className="text-[14px] font-bold text-[#CCC]">「{query}」は見つかりませんでした</p>
            <p className="text-[11px] text-[#DDD]">IP名・シリーズ名で探してみてください</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   通知センター（在庫復活を主役に）
───────────────────────────────────────────── */

const NOTIF_STYLE: Record<AppNotification['type'], { accent: string; label: string }> = {
  restock:   { accent: '#22C55E', label: '在庫復活' },
  release:   { accent: '#F2B800', label: '発売' },
  upcoming:  { accent: '#1D4ED8', label: '予告' },
  community: { accent: '#8B5CF6', label: 'みんな' },
};

function NotificationCenter({
  onClose, onOpenGacha, onOpenMap,
}: { onClose: () => void; onOpenGacha: (id: string) => void; onOpenMap: () => void }) {
  const restock = MOCK_NOTIFICATIONS.find((n) => n.type === 'restock');
  const others  = MOCK_NOTIFICATIONS.filter((n) => n.type !== 'restock');
  const heroGacha = restock?.gachaId ? GACHA_ITEMS.find((g) => g.id === restock.gachaId) : undefined;

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#FFFEEF]">
      <div className="flex-shrink-0 bg-white flex items-center gap-3 px-4 pt-12 pb-3"
        style={{ borderBottom: '1.5px solid #EDE9D8' }}>
        <button onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: '#F5F0E0' }}>
          <ArrowLeft size={18} color="#111" />
        </button>
        <p className="text-[16px] font-black text-[#111]">お知らせ</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* 在庫復活＝一撃ヒーロー */}
        {restock && heroGacha && (
          <button
            onClick={onOpenMap}
            className="w-full relative rounded-[22px] overflow-hidden text-left active:scale-[0.98] transition-transform"
            style={{ height: 168 }}
          >
            <div className="absolute inset-0"
              style={{ background: `linear-gradient(145deg, ${heroGacha.gradientFrom} 0%, ${heroGacha.gradientTo} 100%)` }} />
            <div className="absolute inset-0 flex flex-col justify-between p-4"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0.05))' }}>
              <span className="self-start px-2.5 py-1 rounded-full text-[11px] font-black flex items-center gap-1"
                style={{ background: '#22C55E', color: 'white' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-white" /> 在庫が復活！
              </span>
              <div>
                <p className="text-[18px] font-black text-white leading-tight mb-1">{restock.body}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-black"
                    style={{ background: 'white', color: '#111' }}>
                    <MapPin size={12} /> マップで見る
                  </span>
                  <span className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    {timeAgo(restock.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </button>
        )}

        {/* その他の通知 */}
        <div className="space-y-2">
          {others.map((n) => {
            const st = NOTIF_STYLE[n.type];
            return (
              <button
                key={n.id}
                onClick={() => (n.gachaId ? onOpenGacha(n.gachaId) : undefined)}
                className="mikke-feed-card w-full flex items-start gap-3 px-4 py-3.5 text-left"
              >
                <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ background: n.read ? '#E5E1CE' : st.accent }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black"
                      style={{ background: `${st.accent}1A`, color: st.accent }}>{st.label}</span>
                    <span className="text-[10px] text-[#AAA]">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="text-[13px] text-[#333] leading-relaxed">{n.body}</p>
                </div>
                <ChevronRight size={15} color="#CCC" className="mt-1 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   お気に入りタブ
───────────────────────────────────────────── */

function FavoriteCard({
  item, isEditMode, onTap, onUnlike,
}: { item: GachaItem; isEditMode: boolean; onTap: () => void; onUnlike: () => void }) {
  const stCfg   = getStatusStyle(item.status);
  const stLabel = getStatusLabel(item);
  return (
    <div
      className="relative rounded-[18px] overflow-hidden active:scale-[0.97] transition-transform"
      style={{ aspectRatio: '3/4', cursor: 'pointer' }}
      onClick={() => { if (!isEditMode) onTap(); }}
    >
      <div className="absolute inset-0"
        style={{ background: `linear-gradient(150deg, ${item.gradientFrom} 0%, ${item.gradientTo} 100%)` }} />

      <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
        <span className="px-2 py-0.5 rounded-full text-[9px] font-black"
          style={{ background: stCfg.bg, color: stCfg.text }}>
          {stLabel}
        </span>
        {isEditMode && (
          <button
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(0,0,0,0.55)' }}
            onClick={(e) => { e.stopPropagation(); onUnlike(); }}
          >
            <X size={11} color="white" />
          </button>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5 pt-8"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)' }}>
        <p className="text-[9px] font-bold mb-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>{item.ipName}</p>
        <p className="text-[11px] font-black text-white leading-tight line-clamp-2">{item.seriesName}</p>
      </div>
    </div>
  );
}

function FavoritesTab({
  likedIds, onUnlike, onTap, onSwitchToNew,
}: {
  likedIds: Set<string>;
  onUnlike: (id: string) => void;
  onTap: (id: string) => void;
  onSwitchToNew: () => void;
}) {
  const [isEditMode, setIsEditMode] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ウォッチリスト＝行動起点。今引けるもの(on_sale)を上に
  const likedItems = GACHA_ITEMS.filter((g) => likedIds.has(g.id))
    .sort((a, b) => (a.status === 'on_sale' ? 0 : 1) - (b.status === 'on_sale' ? 0 : 1));

  const startLongPress = useCallback(() => {
    timerRef.current = setTimeout(() => setIsEditMode(true), 600);
  }, []);
  const cancelLongPress = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  if (likedItems.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: '#FFF7E0' }}>
          <Heart size={28} color="#F2B800" />
        </div>
        <div className="text-center">
          <p className="text-[16px] font-black text-[#111]">まだお気に入りがありません</p>
          <p className="text-[13px] text-[#AAA] mt-1.5 leading-relaxed">
            新着タブでハートを押すと<br />あなた専用のリストができます
          </p>
        </div>
        <button
          onClick={onSwitchToNew}
          className="px-6 py-2.5 rounded-full text-[13px] font-black"
          style={{ background: '#F2B800', color: 'white' }}
        >
          新着を見る
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* 編集モードバー */}
      <div className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: '1px solid #F0ECD8' }}>
        <p className="text-[12px] text-[#AAA]">
          {isEditMode ? '長押しで削除できます' : `引きたいもの ${likedItems.length}件`}
        </p>
        {isEditMode ? (
          <button className="text-[13px] font-black" style={{ color: '#F2B800' }}
            onClick={() => setIsEditMode(false)}>
            完了
          </button>
        ) : (
          <button className="text-[12px] font-bold text-[#AAA]"
            onClick={() => setIsEditMode(true)}>
            編集
          </button>
        )}
      </div>

      {/* グリッド */}
      <div
        className="grid grid-cols-2 gap-3 px-4 py-4"
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
      >
        {likedItems.map((item) => (
          <FavoriteCard
            key={item.id}
            item={item}
            isEditMode={isEditMode}
            onTap={() => onTap(item.id)}
            onUnlike={() => onUnlike(item.id)}
          />
        ))}
      </div>
      <div className="h-4" />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Layer C — UGC Cards
───────────────────────────────────────────── */


/* ─────────────────────────────────────────────
   HomeScreen
───────────────────────────────────────────── */

export function HomeScreen() {
  const {
    feedItems, toggleLike, selectFeedItem, selectUser,
    likedGachaItemIds, toggleGachaLike, selectGachaItem, navigateTo,
    homeTab, setHomeTab,
  } = useSunlit();

  const [seeAll, setSeeAll]         = useState<{ title: string; items: GachaItem[] } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen]   = useState(false);
  const [notifSeen, setNotifSeen]   = useState(false);

  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => !n.read).length;

  const filtered = GACHA_ITEMS;

  /* 推しの新作 */
  const likedIPs = new Set(
    GACHA_ITEMS.filter((g) => likedGachaItemIds.has(g.id)).map((g) => g.ipName)
  );
  const personalItems = filtered.filter((g) => likedIPs.has(g.ipName));

  /* 話題のガチャ：weeklyPulls 上位8（coming_soon除く） */
  const popularItems = [...filtered]
    .filter((g) => g.status !== 'coming_soon')
    .sort((a, b) => b.weeklyPulls - a.weeklyPulls)
    .slice(0, 8);

  /* コラボ・限定 */
  const collabItems = filtered.filter((g) => g.isCollab);

  /* 続編・新弾登場 */
  const continuationItems = [...filtered.filter((g) => g.isContinuation)]
    .sort((a, b) => (likedIPs.has(b.ipName) ? 1 : 0) - (likedIPs.has(a.ipName) ? 1 : 0));

  /* もうすぐ発売 */
  const comingSoonItems = filtered.filter((g) => g.status === 'coming_soon');

  /* また引ける！（再販） */
  const reissueItems = filtered.filter((g) => g.isReissue);

  /* ── ヒーロー枠：優先度カスケード ──
     ① お気に入りの新作 → ② 来週から（予告）→ ③ 話題（FOMO）
     すべて裏付けのあるデータのみ。ホームは「期待」を担い、行動はマップに橋渡しする。
     ※締切カウントダウンは信頼できるデータが取れないため不採用（Phase2でUGC化） */
  const personalOnSale = personalItems
    .filter((g) => g.status === 'on_sale')
    .sort((a, b) => b.weeklyPulls - a.weeklyPulls);
  const upcomingItems = [
    ...personalItems.filter((g) => g.status === 'coming_soon'),
    ...comingSoonItems.filter((g) => !likedIPs.has(g.ipName)),
  ];

  /* アンビエント鼓動バー用：みんなの最新の動きを文章化 */
  const PULL_VERB = { hit: '神引きした', miss: '爆死した', duplicate: 'ダブった' } as const;
  const STOCK_WORD = { in_stock: '在庫あり', out_of_stock: '在庫なし', not_available: '取扱なし' } as const;
  const pulseMessages = feedItems.map((f) =>
    f.type === 'pull'
      ? `${f.userName}さんが${f.machine.ipName}を${PULL_VERB[f.pull!.result]}`
      : `${f.spot.name}で${f.machine.ipName}が${STOCK_WORD[f.report!.status]}`
  );

  let heroItem: GachaItem | undefined;
  let heroMode: HeroMode = 'trending';
  if (personalOnSale[0])     { heroItem = personalOnSale[0]; heroMode = 'new'; }
  else if (upcomingItems[0]) { heroItem = upcomingItems[0];  heroMode = 'upcoming'; }
  else                       { heroItem = popularItems[0];   heroMode = 'trending'; }

  /* ヒーローに出した商品はセクションから除外して重複を防ぐ */
  const ex = (arr: GachaItem[]) => (heroItem ? arr.filter((g) => g.id !== heroItem!.id) : arr);

  /* ── 重複解消：上部の編集レンズで既に出た商品を集める ──
     上部（推しの新作・話題・コラボ・続編・来週から・再販）は意図あるレンズなので
     互いの重複は許容。最下部のジャンルは「まだ出ていない残り物」だけにする */
  const featured = new Set<string>();
  [ex(personalItems), ex(popularItems), ex(collabItems),
   ex(continuationItems), ex(comingSoonItems), ex(reissueItems)]
    .forEach((arr) => arr.forEach((g) => featured.add(g.id)));
  if (heroItem) featured.add(heroItem.id);

  /* ジャンル別（コラボ・再販・coming_soon・既出を除外した残り物） */
  const genrePool      = filtered.filter(
    (g) => !g.isCollab && !g.isReissue && g.status !== 'coming_soon' && !featured.has(g.id)
  );
  const animeItems     = genrePool.filter((g) => g.category === 'anime');
  const characterItems = genrePool.filter((g) => g.category === 'character');
  const otherItems     = genrePool.filter((g) => g.category === 'other');

  return (
    <div className="absolute inset-0 flex flex-col bg-[#FFFEEF]">

      {/* ── ヘッダー ── */}
      <div className="flex-shrink-0 bg-white" style={{ borderBottom: '1.5px solid #EDE9D8' }}>
        <div className="flex items-center justify-between px-5 pt-12 pb-3">
          <h1 className="font-black" style={{ fontSize: 22, letterSpacing: '-0.5px', color: '#F2B800' }}>
            Mikke!
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: '#F5F0E0' }}
            >
              <Search size={17} color="#888" />
            </button>
            <button
              onClick={() => { setNotifOpen(true); setNotifSeen(true); }}
              className="relative w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: '#F5F0E0' }}
            >
              <Bell size={17} color="#888" />
              {!notifSeen && unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                  style={{ background: '#FF4D4D' }}>
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* サブタブ */}
        <div className="flex">
          {([
            { tab: 'new'       as const, label: '新着' },
            { tab: 'community' as const, label: 'みんな' },
            { tab: 'favorites' as const, label: 'お気に入り' },
          ]).map(({ tab, label }) => (
            <button
              key={tab}
              onClick={() => setHomeTab(tab)}
              className="flex-1 py-2.5 text-[13px] font-bold relative"
              style={{ color: homeTab === tab ? '#F2B800' : '#AAA' }}
            >
              {label}
              {homeTab === tab && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2"
                  style={{ width: 20, height: 2.5, background: '#FFCD31', borderRadius: 99 }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── コンテンツ ── */}
      {homeTab === 'favorites' ? (

        /* お気に入りタブ */
        <FavoritesTab
          likedIds={likedGachaItemIds}
          onUnlike={toggleGachaLike}
          onTap={selectGachaItem}
          onSwitchToNew={() => setHomeTab('new')}
        />

      ) : homeTab === 'community' ? (

        /* みんなタブ — Layer C */
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-4 space-y-3">
            {feedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-[14px] font-bold text-[#CCC]">まだ投稿がありません</p>
              </div>
            ) : (
              feedItems.map((item) =>
                item.type === 'pull' ? (
                  <PullCard key={item.id} item={item}
                    onLike={() => toggleLike(item.id)} onTap={() => selectFeedItem(item.id)} onUser={() => selectUser(item.userId)} />
                ) : (
                  <ReportCard key={item.id} item={item}
                    onLike={() => toggleLike(item.id)} onTap={() => selectFeedItem(item.id)} onUser={() => selectUser(item.userId)} />
                )
              )
            )}
          </div>
          <div className="h-4" />
        </div>

      ) : (

        /* 新着タブ */
        <div className="flex-1 overflow-y-auto">

          {/* ── アンビエント鼓動バー：みんなの気配 ── */}
          <AmbientPulse messages={pulseMessages} onTap={() => setHomeTab('community')} />

          {/* ── ヒーロー枠：今週のハイライト ── */}
          {heroItem && (
            <div className="pt-4">
              <HeroCard
                item={heroItem}
                mode={heroMode}
                liked={likedGachaItemIds.has(heroItem.id)}
                onToggleLike={() => toggleGachaLike(heroItem.id)}
                onTap={() => selectGachaItem(heroItem.id)}
              />
            </div>
          )}

          {/* Layer B — セクション群 */}
          <div className="py-4 space-y-7">

            {/* 1. 推しの新作 */}
            {ex(personalItems).length > 0 ? (
              <GachaSection
                title="推しの新作"
                items={ex(personalItems)}
                likedIds={likedGachaItemIds}
                onToggleLike={toggleGachaLike}
                onTap={selectGachaItem}
                onSeeAll={() => setSeeAll({ title: '推しの新作', items: ex(personalItems) })}
              />
            ) : personalItems.length === 0 ? (
              <div className="space-y-2">
                <div className="px-4">
                  <p className="text-[14px] font-black text-[#111]">推しの新作</p>
                </div>
                <div className="mx-4">
                  <button
                    onClick={() => setHomeTab('favorites')}
                    className="w-full rounded-[18px] flex items-center gap-4 px-5 py-4"
                    style={{ background: 'white', border: '1.5px dashed #E5E0D0' }}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: '#FFF7E0' }}>
                      <Heart size={18} color="#F2B800" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[13px] font-black text-[#111]">お気に入りを登録しよう</p>
                      <p className="text-[11px] text-[#AAA] mt-0.5">
                        気になるガチャをハートで保存すると、あなた専用のフィードが生まれます
                      </p>
                    </div>
                    <ChevronRight size={16} color="#CCC" />
                  </button>
                </div>
              </div>
            ) : null}

            {/* 2. 話題のガチャ（ランキング） */}
            <RankedGachaSection title="話題のガチャ" items={ex(popularItems)}
              likedIds={likedGachaItemIds} onToggleLike={toggleGachaLike} onTap={selectGachaItem}
              onSeeAll={() => setSeeAll({ title: '話題のガチャ', items: ex(popularItems) })} />

            {/* 3. コラボ・限定 */}
            <GachaSection title="コラボ・限定" badge="期間限定" items={ex(collabItems)}
              likedIds={likedGachaItemIds} onToggleLike={toggleGachaLike} onTap={selectGachaItem}
              onSeeAll={() => setSeeAll({ title: 'コラボ・限定', items: ex(collabItems) })} />

            {/* 4. 続編・新弾登場 */}
            <GachaSection title="続編・新弾登場" items={ex(continuationItems)}
              likedIds={likedGachaItemIds} onToggleLike={toggleGachaLike} onTap={selectGachaItem}
              onSeeAll={() => setSeeAll({ title: '続編・新弾登場', items: ex(continuationItems) })} />

            {/* 5. もうすぐ発売 */}
            <GachaSection title="もうすぐ発売" items={ex(comingSoonItems)}
              likedIds={likedGachaItemIds} onToggleLike={toggleGachaLike} onTap={selectGachaItem}
              onSeeAll={() => setSeeAll({ title: 'もうすぐ発売', items: ex(comingSoonItems) })} />

            {/* 6. また引ける！ */}
            <GachaSection title="また引ける！" items={ex(reissueItems)}
              likedIds={likedGachaItemIds} onToggleLike={toggleGachaLike} onTap={selectGachaItem}
              onSeeAll={() => setSeeAll({ title: 'また引ける！', items: ex(reissueItems) })} />

            {/* 7. アニメ・ゲーム */}
            <GachaSection title="アニメ・ゲーム" items={ex(animeItems)}
              likedIds={likedGachaItemIds} onToggleLike={toggleGachaLike} onTap={selectGachaItem}
              onSeeAll={() => setSeeAll({ title: 'アニメ・ゲーム', items: ex(animeItems) })} />

            {/* 8. キャラクター */}
            <GachaSection title="キャラクター" items={ex(characterItems)}
              likedIds={likedGachaItemIds} onToggleLike={toggleGachaLike} onTap={selectGachaItem}
              onSeeAll={() => setSeeAll({ title: 'キャラクター', items: ex(characterItems) })} />

            {/* 9. 動物・食べ物・癒し系 */}
            <GachaSection title="動物・食べ物・癒し系" items={ex(otherItems)}
              likedIds={likedGachaItemIds} onToggleLike={toggleGachaLike} onTap={selectGachaItem}
              onSeeAll={() => setSeeAll({ title: '動物・食べ物・癒し系', items: ex(otherItems) })} />

          </div>

          <div className="h-6" />
        </div>
      )}

      {/* すべて見る 一覧オーバーレイ */}
      {seeAll && (
        <SegmentListOverlay
          title={seeAll.title}
          items={seeAll.items}
          likedIds={likedGachaItemIds}
          onToggleLike={toggleGachaLike}
          onTap={(id) => { setSeeAll(null); selectGachaItem(id); }}
          onClose={() => setSeeAll(null)}
        />
      )}

      {/* 検索オーバーレイ */}
      {searchOpen && (
        <SearchOverlay
          likedIds={likedGachaItemIds}
          onToggleLike={toggleGachaLike}
          onTap={(id) => { setSearchOpen(false); selectGachaItem(id); }}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {/* 通知センター */}
      {notifOpen && (
        <NotificationCenter
          onClose={() => setNotifOpen(false)}
          onOpenGacha={(id) => { setNotifOpen(false); selectGachaItem(id); }}
          onOpenMap={() => { setNotifOpen(false); navigateTo('map'); }}
        />
      )}

    </div>
  );
}
