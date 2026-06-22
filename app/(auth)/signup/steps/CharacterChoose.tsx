'use client';

import { ArrowLeft } from 'lucide-react';

const IP_LIST = ['ポケモン', 'ONE PIECE', 'ハイキュー!!', '呪術廻戦', 'チェンソーマン', 'ジョジョ', 'ちいかわ', 'サンリオ', 'HUNTER×HUNTER', 'SPY×FAMILY', 'ドラゴンボール', 'ミッフィー'];

interface Props {
  selected: string[];
  onToggle: (ip: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function CharacterChoose({ selected, onToggle, onNext, onBack }: Props) {
  return (
    <div className="flex flex-col min-h-screen bg-[#FFFEEF] px-6 pt-12 pb-8">
      <button onClick={onBack} className="self-start mb-6 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#F0ECD8' }}>
        <ArrowLeft size={18} color="#555" />
      </button>
      <h2 className="text-2xl font-black text-[#111] mb-2">好きなキャラクターは？</h2>
      <p className="text-[#888] text-[13px] mb-8">フィードとマップをカスタマイズします</p>

      <div className="flex flex-wrap gap-3 mb-auto">
        {IP_LIST.map((ip) => {
          const active = selected.includes(ip);
          return (
            <button
              key={ip}
              onClick={() => onToggle(ip)}
              className="px-4 py-2.5 rounded-full text-[14px] font-bold transition-colors"
              style={active
                ? { background: '#F2B800', color: 'white' }
                : { background: '#F0ECD8', color: '#666' }}
            >
              {ip}
            </button>
          );
        })}
      </div>

      <button
        onClick={onNext}
        disabled={selected.length === 0}
        className="mt-8 w-full py-4 rounded-2xl font-black text-[16px] transition-opacity"
        style={{ background: '#F2B800', color: 'white', opacity: selected.length === 0 ? 0.4 : 1 }}
      >
        次へ（{selected.length}件選択）
      </button>
    </div>
  );
}
