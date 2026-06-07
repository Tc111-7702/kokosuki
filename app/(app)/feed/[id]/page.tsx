'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Heart, MapPin, Share2 } from 'lucide-react';
import { useSunlit } from '@/lib/sunlit/store';
import { ipGradient } from '@/lib/sunlit/gacha-data';
import { Avatar } from '@/components/sunlit/ui/Avatar';

const RESULT_CONFIG = {
  hit:       { label: '神引き', bg: '#FFF8E1', text: '#F59E0B', border: '#FDE68A' },
  miss:      { label: '爆死',   bg: '#FFF1F1', text: '#EF4444', border: '#FECACA' },
  duplicate: { label: 'ダブり', bg: '#F0F4FF', text: '#6366F1', border: '#C7D2FE' },
};

const STOCK_CONFIG = {
  in_stock:      { label: '在庫あり', bg: '#F0FDF4', text: '#16A34A', dot: '#22C55E' },
  out_of_stock:  { label: '在庫なし', bg: '#FFF1F1', text: '#EF4444', dot: '#EF4444' },
  not_available: { label: '取扱なし', bg: '#F5F5F5', text: '#9CA3AF', dot: '#D1D5DB' },
};

export default function FeedDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { feedItems, toggleLike } = useSunlit();

  const item = feedItems.find((f) => f.id === id);
  if (!item) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[14px] text-[#AAA]">投稿が見つかりません</p>
      </div>
    );
  }

  const isPull = item.type === 'pull';
  const gr = ipGradient(item.machine.ipName);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-white">
      {/* ヘッダー */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 pt-12 pb-3"
        style={{ borderBottom: '1.5px solid #EDE9D8' }}>
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: '#F5F0E0' }}
        >
          <ArrowLeft size={18} color="#111" />
        </button>
        <div className="flex items-center gap-2">
          <Avatar name={item.userName} size={28} />
          <span className="text-[14px] font-bold text-[#111]">{item.userName}</span>
        </div>
      </div>

      {/* 画像エリア */}
      {isPull ? (
        <div
          className="relative w-full"
          style={{ aspectRatio: '16/9', background: `linear-gradient(150deg, ${gr.from}, ${gr.to})` }}
        >
          {item.pull && (
            <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-[13px] font-bold"
              style={{
                background: RESULT_CONFIG[item.pull.result].bg,
                color:      RESULT_CONFIG[item.pull.result].text,
                border:     `1px solid ${RESULT_CONFIG[item.pull.result].border}`,
              }}>
              {RESULT_CONFIG[item.pull.result].label}
            </div>
          )}
          {item.pull?.itemName && (
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-12"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
              <p className="text-[16px] font-black text-white leading-tight">{item.pull.itemName}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full flex items-center justify-center py-8"
          style={{ background: '#F5F4F0' }}>
          <div className="w-32 h-32 rounded-2xl"
            style={{ background: `linear-gradient(145deg, ${gr.from}, ${gr.to})` }} />
        </div>
      )}

      {/* コンテンツ */}
      <div className="px-4 py-5 space-y-4">
        <div>
          <h2 className="text-[16px] font-black text-[#111] leading-snug">
            {isPull && item.pull?.itemName ? item.pull.itemName : item.machine.seriesName}
          </h2>
          <p className="text-[12px] text-[#999] mt-1">
            {item.machine.seriesName} · {item.machine.maker}
          </p>
        </div>

        {!isPull && item.report && (
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-bold"
            style={{ background: STOCK_CONFIG[item.report.status].bg, color: STOCK_CONFIG[item.report.status].text }}>
            <span className="w-2 h-2 rounded-full"
              style={{ background: STOCK_CONFIG[item.report.status].dot }} />
            {STOCK_CONFIG[item.report.status].label}
          </div>
        )}

        {isPull && item.pull?.memo && (
          <p className="text-[14px] text-[#444] leading-relaxed">{item.pull.memo}</p>
        )}

        <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: '#F7F6F3' }}>
          <MapPin size={16} color="#FFCD31" />
          <div>
            <p className="text-[14px] font-bold text-[#111]">{item.spot.name}</p>
            <p className="text-[11px] text-[#999] mt-0.5">{item.spot.address}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-full active:scale-95 transition-transform"
            style={{ background: item.liked ? '#FFF8D0' : '#F0EFEC' }}
            onClick={() => toggleLike(item.id)}
          >
            <Heart size={16} fill={item.liked ? '#FF4D4D' : 'none'} color={item.liked ? '#FF4D4D' : '#666'} />
            <span className="text-[14px] font-bold" style={{ color: item.liked ? '#FF4D4D' : '#666' }}>
              {item.likeCount}
            </span>
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-full active:scale-95 transition-transform"
            style={{ background: '#F0EFEC' }}
          >
            <Share2 size={16} color="#666" />
            <span className="text-[14px] font-bold text-[#666]">シェア</span>
          </button>
        </div>
      </div>

      <div className="h-8" />
    </div>
  );
}
