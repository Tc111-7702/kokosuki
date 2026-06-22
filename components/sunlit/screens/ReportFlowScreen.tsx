'use client';

import { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { useSunlit } from '@/lib/sunlit/store';
import { MOCK_MACHINES } from '@/lib/sunlit/mock-data';
import { ipGradient } from '@/lib/sunlit/gacha-data';
import type { StockStatus, StockQuantity, Machine } from '@/lib/sunlit/types';

type Step = 'machine' | 'status' | 'done';

const STATUS_OPTIONS: Array<{
  value: StockStatus;
  label: string;
  sub: string;
  bg: string;
  color: string;
  border: string;
  shadow: string;
  dot: string;
}> = [
  {
    value: 'in_stock',
    label: '在庫あり',
    sub: 'まだ引けるよ！',
    bg: '#F0FDF4', color: '#15803D', border: '#86EFAC', shadow: '#BBF7D0', dot: '#22C55E',
  },
  {
    value: 'out_of_stock',
    label: '在庫なし',
    sub: '売り切れてた',
    bg: '#FFF1F1', color: '#C41E1E', border: '#FECACA', shadow: '#FCA5A5', dot: '#EF4444',
  },
  {
    value: 'not_available',
    label: '取扱なし',
    sub: 'この機種はない',
    bg: '#F5F5F4', color: '#78716C', border: '#D6D3D1', shadow: '#E7E5E4', dot: '#A8A29E',
  },
];

// 「急ぐべき?」に答える緊急シグナル。残りわずか＝最強のアラート
const QUANTITY_OPTIONS: Array<{ value: StockQuantity; label: string }> = [
  { value: 'low',    label: '残りわずか' },
  { value: 'normal', label: 'そこそこ'   },
  { value: 'plenty', label: 'たっぷり'   },
];

function StepBar({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-1.5 px-5 pb-3 pt-1">
      {([1, 2] as const).map((i) => (
        <div
          key={i}
          className="h-1.5 rounded-full transition-all duration-300"
          style={{ flex: i === step ? 2 : 1, background: i <= step ? '#FFCD31' : '#EDE9D8' }}
        />
      ))}
    </div>
  );
}

function MachineList({
  machines,
  selected,
  onSelect,
}: {
  machines: Machine[];
  selected: Machine | null;
  onSelect: (m: Machine) => void;
}) {
  if (machines.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-[14px] text-[#CCC] font-bold">機種情報がありません</p>
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {machines.map((m) => {
        const isSelected = selected?.id === m.id;
        return (
          <button
            key={m.id}
            className="mikke-card w-full text-left flex items-center gap-3 px-4 py-3.5"
            data-selected={isSelected ? 'true' : 'false'}
            onClick={() => onSelect(m)}
          >
            <div className="w-12 h-12 rounded-xl flex-shrink-0"
              style={{ background: `linear-gradient(145deg, ${ipGradient(m.ipName).from}, ${ipGradient(m.ipName).to})` }} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold leading-snug line-clamp-2" style={{ color: isSelected ? '#111' : '#333' }}>
                {m.seriesName}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: isSelected ? '#555' : '#999' }}>
                {m.ipName} · ¥{m.price}
              </p>
            </div>
            {isSelected && (
              <div className="w-5 h-5 rounded-full bg-[#C8960A] flex items-center justify-center flex-shrink-0">
                <Check size={12} color="white" strokeWidth={3} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function ReportFlowScreen() {
  const { goBack, selectedSpotId, navigateTo, selectSpot } = useSunlit();
  const machines = MOCK_MACHINES.filter((m) => m.spotId === selectedSpotId);

  const [step, setStep]                     = useState<Step>('machine');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [status, setStatus]                 = useState<StockStatus | null>(null);
  const [quantity, setQuantity]             = useState<StockQuantity>('normal');

  /* ── 完了画面 ── */
  if (step === 'done') {
    return (
      <div className="absolute inset-0 bg-[#FFFEEF] flex flex-col items-center justify-center px-6 gap-5">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mikke-mascot-in"
          style={{ background: '#FFCD31', boxShadow: '0 6px 0 #C8960A' }}
        >
          <Check size={36} color="#111" strokeWidth={3} />
        </div>
        <div className="text-center space-y-1.5">
          <p className="text-[24px] font-black text-[#111]" style={{ letterSpacing: '-0.5px' }}>
            報告ありがとう！
          </p>
          <p className="text-[14px] text-[#999]">みんなの役に立ったよ</p>
        </div>
        <div className="w-full mt-4 space-y-3">
          <button className="mikke-btn-yellow" onClick={() => selectSpot(null)}>
            マップに戻る
          </button>
          <button className="mikke-btn-ghost" style={{ width: '100%' }} onClick={() => navigateTo('home')}>
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  /* ── ステップ画面 ── */
  return (
    <div className="absolute inset-0 bg-[#FFFEEF] flex flex-col">
      {/* ヘッダー */}
      <div className="flex-shrink-0 bg-white" style={{ borderBottom: '1.5px solid #EDE9D8' }}>
        <div className="flex items-center gap-3 px-4 pt-12 pb-2">
          <button
            className="w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0"
            style={{ background: '#F5F2E8' }}
            onClick={goBack}
          >
            <ArrowLeft size={18} color="#444" />
          </button>
          <h1 className="font-black text-[18px] text-[#111]" style={{ letterSpacing: '-0.3px' }}>
            在庫を報告する
          </h1>
        </div>
        <StepBar step={step === 'machine' ? 1 : 2} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* STEP 1: 機種選択 */}
        {step === 'machine' && (
          <>
            <p className="text-[13px] text-[#AAA] font-bold mb-3">どの機種を報告しますか？</p>
            <MachineList machines={machines} selected={selectedMachine} onSelect={setSelectedMachine} />
          </>
        )}

        {/* STEP 2: 在庫状況 */}
        {step === 'status' && (
          <div className="space-y-3">
            <p className="text-[13px] text-[#AAA] font-bold mb-3">在庫状況を教えて！</p>

            {STATUS_OPTIONS.map((opt) => {
              const active = status === opt.value;
              return (
                <button
                  key={opt.value}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all"
                  style={{
                    background: active ? opt.bg   : 'white',
                    border:    `2px solid ${active ? opt.border : '#EDE9D8'}`,
                    boxShadow: `0 4px 0 ${active ? opt.shadow : '#E5E1CE'}`,
                  }}
                  onClick={() => setStatus(opt.value)}
                >
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: opt.dot }} />
                  <div className="flex-1">
                    <p className="text-[16px] font-black" style={{ color: opt.color }}>{opt.label}</p>
                    <p className="text-[12px] mt-0.5" style={{ color: opt.color, opacity: 0.7 }}>{opt.sub}</p>
                  </div>
                  {active && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: opt.dot }}>
                      <Check size={12} color="white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}

            {/* 在庫量（在庫ありのみ） */}
            {status === 'in_stock' && (
              <div className="pt-1">
                <p className="text-[12px] text-[#AAA] font-bold mb-2">どのくらいある？</p>
                <div className="flex gap-2">
                  {QUANTITY_OPTIONS.map((q) => (
                    <button
                      key={q.value}
                      className="flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-all"
                      style={{
                        background: quantity === q.value ? '#FFCD31' : '#F5F2E8',
                        color:      quantity === q.value ? '#111'    : '#888',
                        border:    `1.5px solid ${quantity === q.value ? '#C8960A' : 'transparent'}`,
                        boxShadow: `0 3px 0 ${quantity === q.value ? '#C8960A' : '#E5E1CE'}`,
                      }}
                      onClick={() => setQuantity(q.value)}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* フッター CTA */}
      <div
        className="flex-shrink-0 px-4 pb-8 pt-3"
        style={{ borderTop: '1.5px solid #EDE9D8', background: '#FFFEEF' }}
      >
        {step === 'machine' ? (
          <button className="mikke-btn-yellow" disabled={!selectedMachine} onClick={() => setStep('status')}>
            次へ
          </button>
        ) : (
          <button className="mikke-btn-yellow" disabled={!status} onClick={() => setStep('done')}>
            報告する
          </button>
        )}
      </div>
    </div>
  );
}
