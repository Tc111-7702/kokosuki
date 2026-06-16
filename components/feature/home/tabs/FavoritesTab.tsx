'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, X } from 'lucide-react';
import { useSunlit } from '@/lib/sunlit/store';
import { GACHA_ITEMS, getStatusLabel, getStatusStyle } from '@/lib/sunlit/gacha-data';
import type { GachaItem } from '@/lib/sunlit/gacha-data';
import { useIsMobile } from '@/lib/useIsMobile';

function FavoriteCard({
  item, isEditMode, tall, onTap, onUnlike,
}: { item: GachaItem; isEditMode: boolean; tall: boolean; onTap: () => void; onUnlike: () => void }) {
  const stCfg   = getStatusStyle(item.status);
  const stLabel = getStatusLabel(item);

  return (
    <div
      className="relative rounded-[18px] overflow-hidden active:scale-[0.97] transition-transform"
      style={{ aspectRatio: tall ? '3/4' : '16/9', cursor: 'pointer' }}
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

export function FavoritesTab() {
  const { likedGachaItemIds, toggleGachaLike, setHomeTab } = useSunlit();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isEditMode, setIsEditMode] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const likedItems = GACHA_ITEMS
    .filter((g) => likedGachaItemIds.has(g.id))
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
          onClick={() => setHomeTab('new')}
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

      <div
        className={isMobile ? 'grid grid-cols-2 gap-3 px-4 py-4' : 'grid grid-cols-3 gap-2 px-4 py-4'}
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
      >
        {likedItems.map((item) => (
          <FavoriteCard
            key={item.id}
            item={item}
            isEditMode={isEditMode}
            tall={isMobile}
            onTap={() => router.push(`/gacha/${item.id}`)}
            onUnlike={() => toggleGachaLike(item.id)}
          />
        ))}
      </div>
      <div className="h-4" />
    </div>
  );
}
