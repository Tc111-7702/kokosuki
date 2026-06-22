'use client';

import { ArrowLeft, Heart, MapPin, Share2 } from 'lucide-react';
import { useSunlit } from '@/lib/sunlit/store';
import { ipGradient } from '@/lib/sunlit/gacha-data';
import { Avatar } from '../ui/Avatar';

const RESULT_CONFIG = {
  hit:       { label: '神引き',  bg: '#FFF8E1', text: '#F59E0B', border: '#FDE68A' },
  miss:      { label: '爆死',    bg: '#FFF1F1', text: '#EF4444', border: '#FECACA' },
  duplicate: { label: 'ダブり',  bg: '#F0F4FF', text: '#6366F1', border: '#C7D2FE' },
};

const STOCK_CONFIG = {
  in_stock:      { label: '在庫あり', bg: '#F0FDF4', text: '#16A34A', dot: '#22C55E' },
  out_of_stock:  { label: '在庫なし', bg: '#FFF1F1', text: '#EF4444', dot: '#EF4444' },
  not_available: { label: '取扱なし', bg: '#F5F5F5', text: '#9CA3AF', dot: '#D1D5DB' },
};

export function FeedDetailScreen() {
  const { feedItems, selectedFeedItemId, goBack, toggleLike, selectUser } = useSunlit();
  const item = feedItems.find((f) => f.id === selectedFeedItemId);
  if (!item) return null;

  const isPull = item.type === 'pull';

  return (
    <div className="absolute inset-0 bg-white flex flex-col overflow-y-auto">
      {/* ヘッダー */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 pt-12 pb-3 border-b border-[#F0EFEC]">
        <button onClick={goBack} className="w-8 h-8 flex items-center justify-center rounded-full active:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <button onClick={() => selectUser(item.userId)} className="flex items-center gap-2 active:opacity-70">
          <Avatar name={item.userName} size={28} />
          <span className="text-sm font-medium text-[#111]">{item.userName}</span>
        </button>
      </div>

      {/* メイン画像（プレースホルダーはIPグラデ） */}
      {isPull && item.pull?.imageUrl && (
        <div className="relative w-full" style={{ aspectRatio: '4/5', background: `linear-gradient(150deg, ${ipGradient(item.machine.ipName).from}, ${ipGradient(item.machine.ipName).to})` }}>
          {item.pull && (
            <div
              className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-sm font-bold"
              style={{
                background: RESULT_CONFIG[item.pull.result].bg,
                color: RESULT_CONFIG[item.pull.result].text,
                border: `1px solid ${RESULT_CONFIG[item.pull.result].border}`,
              }}
            >
              {RESULT_CONFIG[item.pull.result].label}
            </div>
          )}
        </div>
      )}

      {/* 在庫報告ヘッダー画像（プレースホルダーはIPグラデ） */}
      {!isPull && (
        <div className="w-full h-40 flex items-center justify-center" style={{ background: '#F5F4F0' }}>
          <div className="w-32 h-32 rounded-2xl" style={{ background: `linear-gradient(145deg, ${ipGradient(item.machine.ipName).from}, ${ipGradient(item.machine.ipName).to})` }} />
        </div>
      )}

      {/* コンテンツ */}
      <div className="px-4 py-4 space-y-4">
        {/* タイトル */}
        <div>
          <h2 className="text-base font-bold text-[#111] leading-snug">
            {isPull && item.pull?.itemName ? item.pull.itemName : item.machine.seriesName}
          </h2>
          <p className="text-xs text-[#999] mt-1">{item.machine.seriesName} · {item.machine.maker}</p>
        </div>

        {/* 在庫バッジ（報告の場合） */}
        {!isPull && item.report && (
          <div
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
            style={{
              background: STOCK_CONFIG[item.report.status].bg,
              color: STOCK_CONFIG[item.report.status].text,
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: STOCK_CONFIG[item.report.status].dot }}
            />
            {STOCK_CONFIG[item.report.status].label}
          </div>
        )}

        {/* メモ */}
        {isPull && item.pull?.memo && (
          <p className="text-sm text-[#444] leading-relaxed">{item.pull.memo}</p>
        )}

        {/* スポット情報 */}
        <div
          className="flex items-center gap-3 p-3 rounded-2xl"
          style={{ background: '#F7F6F3' }}
        >
          <MapPin size={16} color="#FFCD31" />
          <div>
            <p className="text-sm font-medium text-[#111]">{item.spot.name}</p>
            <p className="text-xs text-[#999] mt-0.5">{item.spot.address}</p>
          </div>
        </div>

        {/* アクション */}
        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-full active:scale-95 transition-transform"
            style={{ background: item.liked ? '#FFF8D0' : '#F0EFEC' }}
            onClick={() => toggleLike(item.id)}
          >
            <Heart
              size={16}
              fill={item.liked ? '#FF4D4D' : 'none'}
              color={item.liked ? '#FF4D4D' : '#666'}
            />
            <span className="text-sm font-medium" style={{ color: item.liked ? '#FF4D4D' : '#666' }}>
              {item.likeCount}
            </span>
          </button>

          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-full active:scale-95 transition-transform"
            style={{ background: '#F0EFEC' }}
          >
            <Share2 size={16} color="#666" />
            <span className="text-sm font-medium text-[#666]">シェア</span>
          </button>
        </div>
      </div>
    </div>
  );
}
