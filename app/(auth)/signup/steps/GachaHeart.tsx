'use client';

import { ArrowLeft, Heart } from 'lucide-react';
import { GACHA_ITEMS } from '@/lib/sunlit/gacha-data';

interface Props {
  liked: string[];
  onToggle: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function GachaHeart({ liked, onToggle, onNext, onBack }: Props) {
  const onSale = GACHA_ITEMS.filter((g) => g.status === 'on_sale').slice(0, 12);

  return (
    <div className="flex flex-col min-h-screen bg-[#FFFEEF] px-6 pt-12 pb-8">
      <button onClick={onBack} className="self-start mb-6 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#F0ECD8' }}>
        <ArrowLeft size={18} color="#555" />
      </button>
      <h2 className="text-2xl font-black text-[#111] mb-2">気になるガチャをハートしよう</h2>
      <p className="text-[#888] text-[13px] mb-6">在庫復活を通知します</p>

      <div className="grid grid-cols-2 gap-3 mb-auto overflow-y-auto">
        {onSale.map((g) => {
          const isLiked = liked.includes(g.id);
          return (
            <button
              key={g.id}
              onClick={() => onToggle(g.id)}
              className="relative p-4 rounded-2xl text-left"
              style={{ background: 'white', border: isLiked ? '2px solid #F2B800' : '2px solid #EDE9D8' }}
            >
              <div className="w-10 h-10 rounded-full mb-2"
                style={{ background: `linear-gradient(145deg, ${g.gradientFrom}, ${g.gradientTo})` }} />
              <p className="text-[12px] font-black text-[#111] leading-snug">{g.seriesName}</p>
              <p className="text-[11px] text-[#AAA] mt-0.5">{g.ipName}</p>
              <span className="absolute top-3 right-3">
                <Heart size={18} fill={isLiked ? '#F2B800' : 'none'} color={isLiked ? '#F2B800' : '#CCC'} />
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={onNext}
        className="mt-8 w-full py-4 rounded-2xl font-black text-[16px]"
        style={{ background: '#F2B800', color: 'white' }}
      >
        {liked.length > 0 ? `次へ（${liked.length}件）` : 'スキップ'}
      </button>
    </div>
  );
}
