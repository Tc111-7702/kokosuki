'use client';

import { ArrowLeft, Bell } from 'lucide-react';

interface Props {
  onAllow: () => void;
  onSkip: () => void;
  onBack: () => void;
}

export function Notification({ onAllow, onSkip, onBack }: Props) {
  return (
    <div className="flex flex-col min-h-screen bg-[#FFFEEF] px-6 pt-12 pb-8">
      <button onClick={onBack} className="self-start mb-6 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#F0ECD8' }}>
        <ArrowLeft size={18} color="#555" />
      </button>
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: '#FFF7E0' }}>
          <Bell size={36} color="#F2B800" />
        </div>
        <h2 className="text-2xl font-black text-[#111] mb-3">在庫復活をすぐ知ろう</h2>
        <p className="text-[#888] text-[14px] mb-10 leading-relaxed">
          お気に入りのガチャの在庫が<br />復活したらすぐにお知らせします。
        </p>
        <button onClick={onAllow}
          className="w-full max-w-xs py-4 rounded-2xl font-black text-white text-[16px] mb-3"
          style={{ background: '#F2B800' }}>
          通知を許可する
        </button>
        <button onClick={onSkip} className="text-[13px] text-[#AAA] font-bold py-2">
          あとで設定する
        </button>
      </div>
    </div>
  );
}
