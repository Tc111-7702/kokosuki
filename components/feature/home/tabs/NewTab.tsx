'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, ChevronRight, Users, Bell, Sparkles, ArrowLeft, Search, X } from 'lucide-react';
import { useSunlit } from '@/lib/sunlit/store';
import { GACHA_ITEMS, getStatusLabel, getStatusStyle } from '@/lib/sunlit/gacha-data';
import type { GachaItem } from '@/lib/sunlit/gacha-data';
import { useIsMobile } from '@/lib/useIsMobile';

/* ─── types ─── */
type HeroMode = 'new' | 'upcoming' | 'trending';

/* ─── HeatRow ─── */
function HeatRow({ item }: { item: GachaItem }) {
  const c = 'rgba(255,255,255,0.7)';
  return (
    <div className="flex items-center gap-1 mt-1.5">
      {item.status === 'coming_soon' ? (
        <><Sparkles size={9} color={c} /><span className="text-[9px] font-bold" style={{ color: c }}>{item.commentCount} 楽しみ</span></>
      ) : (
        <><Users size={9} color={c} /><span className="text-[9px] font-bold" style={{ color: c }}>{item.weeklyPulls} 引いた</span></>
      )}
    </div>
  );
}

/* ─── GachaCard ─── */
function GachaCard({ item, liked, onToggleLike, onTap }: {
  item: GachaItem; liked: boolean; onToggleLike: () => void; onTap: () => void;
}) {
  const stCfg = getStatusStyle(item.status);
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
          style={{ background: stCfg.bg, color: stCfg.text }}>{getStatusLabel(item)}</span>
        <button
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.28)' }}
          onClick={(e) => { e.stopPropagation(); onToggleLike(); }}
        >
          <Heart size={13} fill={liked ? '#FF4D4D' : 'none'} color={liked ? '#FF4D4D' : 'white'} />
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

/* ─── PersonalHeroSection：左にHeroCard・右に推し4枚 2×2グリッド ─── */
function PersonalHeroSection({ heroItem, heroMode, personalItems, likedIds, onToggleLike, onTap, onSeeAll }: {
  heroItem: GachaItem; heroMode: HeroMode;
  personalItems: GachaItem[];
  likedIds: Set<string>;
  onToggleLike: (id: string) => void;
  onTap: (id: string) => void;
  onSeeAll?: () => void;
}) {
  const { eyebrow, headline } = heroCopy(heroItem, heroMode);
  const isUpcoming = heroMode === 'upcoming';
  const heroLiked = likedIds.has(heroItem.id);
  const rightItems = personalItems.slice(0, 4);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-4">
        <p className="text-[14px] font-black text-[#111]">推しの新作</p>
        <button onClick={onSeeAll} className="flex items-center gap-0.5 text-[11px] font-bold text-[#AAA]">
          すべて見る <ChevronRight size={11} />
        </button>
      </div>

      <div className="flex gap-2 px-4" style={{ height: 280 }}>

        {/* 左：HeroCard */}
        <div
          className="flex-1 relative rounded-[22px] overflow-hidden active:scale-[0.98] transition-transform"
          style={{ cursor: 'pointer' }}
          onClick={() => onTap(heroItem.id)}
        >
          <div className="absolute inset-0"
            style={{ background: `linear-gradient(145deg, ${heroItem.gradientFrom} 0%, ${heroItem.gradientTo} 100%)` }} />
          <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-3">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black"
              style={{ background: 'rgba(255,255,255,0.92)', color: '#92620A' }}>{eyebrow}</span>
            <button
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.3)' }}
              onClick={(e) => { e.stopPropagation(); onToggleLike(heroItem.id); }}
            >
              <Heart size={15} fill={heroLiked ? '#FF4D4D' : 'none'} color={heroLiked ? '#FF4D4D' : 'white'} />
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-12"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)' }}>
            <p className="text-[17px] font-black text-white leading-tight mb-1">{headline}</p>
            <p className="text-[10px] font-bold mb-2" style={{ color: 'rgba(255,255,255,0.78)' }}>
              {heroItem.seriesName}
            </p>
            {!isUpcoming && (
              <div className="flex items-center gap-1">
                <Users size={9} color="rgba(255,255,255,0.7)" />
                <span className="text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {heroItem.weeklyPulls}人が引いた
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 右：2×2グリッド */}
        <div className="flex-1 grid grid-cols-2 gap-1.5">
          {rightItems.map((item) => {
            const st = getStatusStyle(item.status);
            const liked = likedIds.has(item.id);
            return (
              <div
                key={item.id}
                className="relative rounded-[14px] overflow-hidden active:scale-[0.97] transition-transform"
                style={{ cursor: 'pointer' }}
                onClick={() => onTap(item.id)}
              >
                <div className="absolute inset-0"
                  style={{ background: `linear-gradient(150deg, ${item.gradientFrom} 0%, ${item.gradientTo} 100%)` }} />
                <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-1.5">
                  <span className="px-1.5 py-0.5 rounded-full text-[7px] font-black"
                    style={{ background: st.bg, color: st.text }}>{getStatusLabel(item)}</span>
                  <button
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(0,0,0,0.28)' }}
                    onClick={(e) => { e.stopPropagation(); onToggleLike(item.id); }}
                  >
                    <Heart size={8} fill={liked ? '#FF4D4D' : 'none'} color={liked ? '#FF4D4D' : 'white'} />
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 px-2 pb-1.5 pt-6"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)' }}>
                  <p className="text-[7px] font-bold" style={{ color: 'rgba(255,255,255,0.65)' }}>{item.ipName}</p>
                  <p className="text-[8px] font-black text-white leading-tight line-clamp-2">{item.seriesName}</p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

/* ─── GachaSection ─── */
function GachaSection({ title, badge, items, likedIds, onToggleLike, onTap, onSeeAll }: {
  title: string; badge?: string; items: GachaItem[];
  likedIds: Set<string>; onToggleLike: (id: string) => void;
  onTap: (id: string) => void; onSeeAll?: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <p className="text-[14px] font-black text-[#111]">{title}</p>
          {badge && <span className="px-2 py-0.5 rounded-full text-[9px] font-black"
            style={{ background: '#FFF7ED', color: '#C2410C' }}>{badge}</span>}
        </div>
        <button onClick={onSeeAll} className="flex items-center gap-0.5 text-[11px] font-bold text-[#AAA]">
          すべて見る <ChevronRight size={11} />
        </button>
      </div>
      <div className="flex gap-2.5 overflow-x-auto overflow-y-hidden scrollbar-hide px-4 pb-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-end flex-shrink-0" style={{ height: 188 }}>
            {/* RankedGachaSection の数字と同じ幅のスペーサー（非表示）で左端を揃える */}
            <span aria-hidden style={{ fontSize: 76, lineHeight: 0.82, fontStyle: 'italic',
              minWidth: 40, marginRight: -4, paddingBottom: 6, visibility: 'hidden' }}>1</span>
            <GachaCard item={item} liked={likedIds.has(item.id)}
              onToggleLike={() => onToggleLike(item.id)} onTap={() => onTap(item.id)} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── RankedGachaSection ─── */
function RankedGachaSection({ title, items, likedIds, onToggleLike, onTap, onSeeAll }: {
  title: string; items: GachaItem[];
  likedIds: Set<string>; onToggleLike: (id: string) => void;
  onTap: (id: string) => void; onSeeAll?: () => void;
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
      <div className="flex gap-2.5 overflow-x-auto overflow-y-hidden scrollbar-hide px-4 pb-1">
        {items.map((item, i) => (
          <div key={item.id} className="flex items-end flex-shrink-0" style={{ height: 188 }}>
            <span className="font-black select-none pointer-events-none text-center"
              style={{ fontSize: 76, lineHeight: 0.82, fontStyle: 'italic',
                color: '#FFCD31', WebkitTextStroke: '2.5px #E0A400',
                minWidth: 40, marginRight: -4, paddingBottom: 6 }}>
              {i + 1}
            </span>
            <GachaCard item={item} liked={likedIds.has(item.id)}
              onToggleLike={() => onToggleLike(item.id)} onTap={() => onTap(item.id)} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── AmbientPulse ─── */
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
        <span className="relative flex-shrink-0 w-2 h-2">
          <span className="absolute inset-0 rounded-full animate-ping" style={{ background: '#22C55E', opacity: 0.55 }} />
          <span className="absolute inset-0 rounded-full" style={{ background: '#22C55E' }} />
        </span>
        <span className="flex-1 text-left text-[12px] font-bold text-[#555] truncate"
          style={{ opacity: show ? 1 : 0, transition: 'opacity 250ms ease' }}>
          {messages[idx]}
        </span>
        <ChevronRight size={14} color="#CCC" />
      </button>
    </div>
  );
}

/* ─── HeroCard ─── */
function heroCopy(item: GachaItem, mode: HeroMode) {
  switch (mode) {
    case 'new':      return { eyebrow: 'あなたの推しに新作', headline: `${item.ipName}、もう引いた？` };
    case 'upcoming': return { eyebrow: '来週から',           headline: `来週、${item.ipName}が出る` };
    default:         return { eyebrow: '今週のハイライト',   headline: `今、${item.ipName}が熱い` };
  }
}

function HeroCard({ item, mode, liked, onToggleLike, onTap }: {
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
        <div className="absolute inset-0"
          style={{ background: `linear-gradient(145deg, ${item.gradientFrom} 0%, ${item.gradientTo} 100%)` }} />
        <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-4">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-black"
            style={{ background: 'rgba(255,255,255,0.92)', color: '#92620A' }}>{eyebrow}</span>
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.3)' }}
            onClick={(e) => { e.stopPropagation(); onToggleLike(); }}
          >
            <Heart size={17} fill={liked ? '#FF4D4D' : 'none'} color={liked ? '#FF4D4D' : 'white'} />
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-16"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)' }}>
          <p className="text-[20px] font-black text-white leading-tight mb-1">{headline}</p>
          <p className="text-[12px] font-bold mb-2.5" style={{ color: 'rgba(255,255,255,0.78)' }}>
            {item.seriesName}
          </p>
          <div className="flex items-center justify-between">
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
            {isUpcoming ? (
              <button
                className="flex items-center gap-1 px-3 py-1.5 rounded-full"
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

/* ─── GridCard & SegmentListOverlay ─── */
function GridCard({ item, liked, onToggleLike, onTap, tall = false }: {
  item: GachaItem; liked: boolean; onToggleLike: () => void; onTap: () => void; tall?: boolean;
}) {
  const stCfg = getStatusStyle(item.status);
  return (
    <div
      className="relative rounded-[20px] overflow-hidden active:scale-[0.97] transition-transform"
      style={{ aspectRatio: tall ? '3/4' : undefined, height: tall ? undefined : 220, cursor: 'pointer' }}
      onClick={onTap}
    >
      <div className="absolute inset-0"
        style={{ background: `linear-gradient(150deg, ${item.gradientFrom} 0%, ${item.gradientTo} 100%)` }} />
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-3">
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black"
          style={{ background: stCfg.bg, color: stCfg.text }}>{getStatusLabel(item)}</span>
        <button
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.28)' }}
          onClick={(e) => { e.stopPropagation(); onToggleLike(); }}
        >
          <Heart size={14} fill={liked ? '#FF4D4D' : 'none'} color={liked ? '#FF4D4D' : 'white'} />
        </button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-12"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)' }}>
        <p className="text-[10px] font-bold mb-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>{item.ipName}</p>
        <p className="text-[13px] font-black text-white leading-tight line-clamp-2">{item.seriesName}</p>
        <HeatRow item={item} />
      </div>
    </div>
  );
}

function SegmentListOverlay({ title, items, likedIds, onToggleLike, onTap, onClose }: {
  title: string; items: GachaItem[];
  likedIds: Set<string>; onToggleLike: (id: string) => void;
  onTap: (id: string) => void; onClose: () => void;
}) {
  const isMobile = useIsMobile();
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#FFFEEF]">
      <div className="flex-shrink-0 bg-white flex items-center gap-3 px-4 pt-12 pb-3"
        style={{ borderBottom: '1.5px solid #EDE9D8' }}>
        <button onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: '#F5F0E0' }}>
          <ArrowLeft size={18} color="#111" />
        </button>
        <p className="text-[16px] font-black text-[#111]">{title}</p>
        <span className="text-[12px] font-bold text-[#AAA]">{items.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className={isMobile ? 'grid grid-cols-2 gap-3 px-4 py-4' : 'grid grid-cols-3 gap-3 px-4 py-4'}>
          {items.map((item) => (
            <GridCard key={item.id} item={item} liked={likedIds.has(item.id)}
              tall={isMobile}
              onToggleLike={() => onToggleLike(item.id)} onTap={() => onTap(item.id)} />
          ))}
        </div>
        <div className="h-4" />
      </div>
    </div>
  );
}

/* ─── SearchOverlay ─── */
const SUGGEST_IPS = ['ポケモン', 'ワンピース', 'ちいかわ', 'サンリオ', '呪術廻戦', 'ハイキュー!!'];

function SearchOverlay({ likedIds, onToggleLike, onTap, onClose }: {
  likedIds: Set<string>; onToggleLike: (id: string) => void;
  onTap: (id: string) => void; onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const query   = q.trim();
  const results = query
    ? GACHA_ITEMS.filter((g) => g.seriesName.includes(query) || g.ipName.includes(query))
    : [];

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#FFFEEF]">
      <div className="flex-shrink-0 bg-white flex items-center gap-2 px-4 pt-12 pb-3"
        style={{ borderBottom: '1.5px solid #EDE9D8' }}>
        <button onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: '#F5F0E0' }}>
          <ArrowLeft size={18} color="#111" />
        </button>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: '#F5F0E0' }}>
          <Search size={15} color="#999" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="ガチャ・IPを検索"
            className="flex-1 bg-transparent outline-none text-[14px] text-[#111] placeholder:text-[#AAA]" />
          {q && <button onClick={() => setQ('')}><X size={14} color="#999" /></button>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {!query ? (
          <div className="px-4 py-5">
            <p className="text-[12px] font-bold text-[#AAA] mb-3">人気のIP</p>
            <div className="flex flex-wrap gap-2">
              {SUGGEST_IPS.map((ip) => (
                <button key={ip} onClick={() => setQ(ip)}
                  className="px-3.5 py-2 rounded-full text-[13px] font-bold"
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
                <GridCard key={item.id} item={item} liked={likedIds.has(item.id)}
                  onToggleLike={() => onToggleLike(item.id)} onTap={() => onTap(item.id)} />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center py-16 gap-2">
            <p className="text-[14px] font-bold text-[#CCC]">「{query}」は見つかりませんでした</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── NewTab ─── */
export function NewTab({ onOpenSearch }: { onOpenSearch?: () => void }) {
  const { likedGachaItemIds, toggleGachaLike, setHomeTab, feedItems } = useSunlit();
  const router = useRouter();
  const isMobile = useIsMobile();
  const tapGacha = (id: string) => router.push(`/gacha/${id}`);
  const [seeAll, setSeeAll]         = useState<{ title: string; items: GachaItem[] } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const filtered = GACHA_ITEMS;

  const likedIPs = new Set(
    GACHA_ITEMS.filter((g) => likedGachaItemIds.has(g.id)).map((g) => g.ipName)
  );

  const MAX_SECTION = 6;
  const cap = (arr: GachaItem[]) => arr.slice(0, MAX_SECTION);

  const personalItems     = filtered.filter((g) => likedIPs.has(g.ipName));
  const popularItems      = [...filtered].filter((g) => g.status !== 'coming_soon')
    .sort((a, b) => b.weeklyPulls - a.weeklyPulls);
  const collabItems       = filtered.filter((g) => g.isCollab);
  const continuationItems = [...filtered.filter((g) => g.isContinuation)]
    .sort((a, b) => (likedIPs.has(b.ipName) ? 1 : 0) - (likedIPs.has(a.ipName) ? 1 : 0));
  const comingSoonItems   = filtered.filter((g) => g.status === 'coming_soon');
  const reissueItems      = filtered.filter((g) => g.isReissue);

  const personalOnSale = personalItems.filter((g) => g.status === 'on_sale')
    .sort((a, b) => b.weeklyPulls - a.weeklyPulls);
  const upcomingItems = [
    ...personalItems.filter((g) => g.status === 'coming_soon'),
    ...comingSoonItems.filter((g) => !likedIPs.has(g.ipName)),
  ];

  let heroItem: GachaItem | undefined;
  let heroMode: HeroMode = 'trending';
  if (personalOnSale[0])     { heroItem = personalOnSale[0]; heroMode = 'new'; }
  else if (upcomingItems[0]) { heroItem = upcomingItems[0];  heroMode = 'upcoming'; }
  else                       { heroItem = popularItems[0];   heroMode = 'trending'; }

  const ex = (arr: GachaItem[]) => (heroItem ? arr.filter((g) => g.id !== heroItem!.id) : arr);

  const featured = new Set<string>();
  [ex(personalItems), ex(popularItems), ex(collabItems),
   ex(continuationItems), ex(comingSoonItems), ex(reissueItems)]
    .forEach((arr) => arr.forEach((g) => featured.add(g.id)));
  if (heroItem) featured.add(heroItem.id);

  const genrePool      = filtered.filter((g) => !g.isCollab && !g.isReissue && g.status !== 'coming_soon' && !featured.has(g.id));
  const animeItems     = genrePool.filter((g) => g.category === 'anime');
  const characterItems = genrePool.filter((g) => g.category === 'character');
  const otherItems     = genrePool.filter((g) => g.category === 'other');

  const PULL_VERB  = { hit: '神引きした', miss: '爆死した', duplicate: 'ダブった' } as const;
  const STOCK_WORD = { in_stock: '在庫あり', out_of_stock: '在庫なし', not_available: '取扱なし' } as const;
  const pulseMessages = feedItems.map((f) =>
    f.type === 'pull'
      ? `${f.userName}さんが${f.machine.ipName}を${PULL_VERB[f.pull!.result]}`
      : `${f.spot.name}で${f.machine.ipName}が${STOCK_WORD[f.report!.status]}`
  );

  const openSeeAll = (title: string, items: GachaItem[]) => setSeeAll({ title, items });

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <AmbientPulse messages={pulseMessages} onTap={() => setHomeTab('community')} />

        {/* ヒーローカード */}
        {heroItem && (
          <div className="pt-4">
            {!isMobile && heroMode === 'new' ? (
              /* デスクトップ: 左右分割Hero */
              <PersonalHeroSection
                heroItem={heroItem} heroMode={heroMode}
                personalItems={ex(personalItems)}
                likedIds={likedGachaItemIds}
                onToggleLike={toggleGachaLike}
                onTap={tapGacha}
                onSeeAll={() => openSeeAll('推しの新作', ex(personalItems))}
              />
            ) : (
              /* モバイル or heroMode!=='new': フル幅HeroCard */
              <HeroCard
                item={heroItem} mode={heroMode}
                liked={likedGachaItemIds.has(heroItem.id)}
                onToggleLike={() => toggleGachaLike(heroItem!.id)}
                onTap={() => tapGacha(heroItem!.id)}
              />
            )}
          </div>
        )}

        <div className="py-4 space-y-7">
          {personalItems.length === 0 ? (
            <div className="space-y-2">
              <div className="px-4"><p className="text-[14px] font-black text-[#111]">推しの新作</p></div>
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
          ) : isMobile ? (
            /* モバイル: HeroCardの下に横スクロールで推しの新作 */
            <GachaSection title="推しの新作" items={ex(personalItems)}
              likedIds={likedGachaItemIds} onToggleLike={toggleGachaLike} onTap={tapGacha}
              onSeeAll={() => openSeeAll('推しの新作', ex(personalItems))} />
          ) : null}

          <RankedGachaSection title="話題のガチャ" items={cap(ex(popularItems))}
            likedIds={likedGachaItemIds} onToggleLike={toggleGachaLike} onTap={tapGacha}
            onSeeAll={() => openSeeAll('話題のガチャ', ex(popularItems))} />

          <GachaSection title="コラボ・限定" badge="期間限定" items={cap(ex(collabItems))}
            likedIds={likedGachaItemIds} onToggleLike={toggleGachaLike} onTap={tapGacha}
            onSeeAll={() => openSeeAll('コラボ・限定', ex(collabItems))} />

          <GachaSection title="続編・新弾登場" items={cap(ex(continuationItems))}
            likedIds={likedGachaItemIds} onToggleLike={toggleGachaLike} onTap={tapGacha}
            onSeeAll={() => openSeeAll('続編・新弾登場', ex(continuationItems))} />

          <GachaSection title="もうすぐ発売" items={cap(ex(comingSoonItems))}
            likedIds={likedGachaItemIds} onToggleLike={toggleGachaLike} onTap={tapGacha}
            onSeeAll={() => openSeeAll('もうすぐ発売', ex(comingSoonItems))} />

          <GachaSection title="また引ける！" items={cap(ex(reissueItems))}
            likedIds={likedGachaItemIds} onToggleLike={toggleGachaLike} onTap={tapGacha}
            onSeeAll={() => openSeeAll('また引ける！', ex(reissueItems))} />

          <GachaSection title="アニメ・ゲーム" items={cap(ex(animeItems))}
            likedIds={likedGachaItemIds} onToggleLike={toggleGachaLike} onTap={tapGacha}
            onSeeAll={() => openSeeAll('アニメ・ゲーム', ex(animeItems))} />

          <GachaSection title="キャラクター" items={cap(ex(characterItems))}
            likedIds={likedGachaItemIds} onToggleLike={toggleGachaLike} onTap={tapGacha}
            onSeeAll={() => openSeeAll('キャラクター', ex(characterItems))} />

          <GachaSection title="動物・食べ物・癒し系" items={cap(ex(otherItems))}
            likedIds={likedGachaItemIds} onToggleLike={toggleGachaLike} onTap={tapGacha}
            onSeeAll={() => openSeeAll('動物・食べ物・癒し系', ex(otherItems))} />
        </div>

        <div className="h-6" />
      </div>

      {seeAll && (
        <SegmentListOverlay
          title={seeAll.title} items={seeAll.items} likedIds={likedGachaItemIds}
          onToggleLike={toggleGachaLike}
          onTap={(id) => { setSeeAll(null); tapGacha(id); }}
          onClose={() => setSeeAll(null)}
        />
      )}

      {searchOpen && (
        <SearchOverlay
          likedIds={likedGachaItemIds} onToggleLike={toggleGachaLike}
          onTap={(id) => { setSearchOpen(false); tapGacha(id); }}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </>
  );
}