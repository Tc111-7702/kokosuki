'use client';

import { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { useSunlit } from '@/lib/sunlit/store';
import { MOCK_MACHINES } from '@/lib/sunlit/mock-data';
import { ipGradient } from '@/lib/sunlit/gacha-data';
import type { PullResult, Machine } from '@/lib/sunlit/types';

type Step = 'machine' | 'result' | 'memo' | 'celebrate';

const RESULT_OPTIONS: Array<{
  value: PullResult;
  label: string;
  sub: string;
  bg: string;
  color: string;
  border: string;
  shadow: string;
  dot: string;
}> = [
  {
    value: 'hit',
    label: '神引き',
    sub: '欲しかったやつ！！',
    bg: '#FFFAE0', color: '#92620A', border: '#FFCD31', shadow: '#F2B800', dot: '#FFCD31',
  },
  {
    value: 'miss',
    label: '爆死',
    sub: '欲しいのと違った…',
    bg: '#FFF1F1', color: '#C41E1E', border: '#FECACA', shadow: '#FCA5A5', dot: '#EF4444',
  },
  {
    value: 'duplicate',
    label: 'ダブり',
    sub: 'また同じやつ',
    bg: '#EEF2FF', color: '#3730A3', border: '#C7D2FE', shadow: '#A5B4FC', dot: '#818CF8',
  },
];

const CELEBRATE_CONFIG: Record<PullResult, { label: string; screenBg: string; badgeBg: string; badgeText: string; badgeBorder: string; badgeShadow: string }> = {
  hit:       { label: '神引き！',   screenBg: '#FFFAE0', badgeBg: '#FFCD31', badgeText: '#92620A', badgeBorder: '#F2B800', badgeShadow: '#C8960A' },
  miss:      { label: '爆死！',     screenBg: '#FFF5F5', badgeBg: '#FFF1F1', badgeText: '#C41E1E', badgeBorder: '#FECACA', badgeShadow: '#FCA5A5' },
  duplicate: { label: 'ダブった！', screenBg: '#F0F1FF', badgeBg: '#EEF2FF', badgeText: '#3730A3', badgeBorder: '#C7D2FE', badgeShadow: '#A5B4FC' },
};

function StepBar({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-1.5 px-5 pb-3 pt-1">
      {([1, 2, 3] as const).map((i) => (
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

export function PullFlowScreen() {
  const { goBack, selectedSpotId, navigateTo } = useSunlit();
  const machines = MOCK_MACHINES.filter((m) => m.spotId === selectedSpotId);

  const [step, setStep]                       = useState<Step>('machine');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [result, setResult]                   = useState<PullResult | null>(null);
  const [itemName, setItemName]               = useState('');
  const [memo, setMemo]                       = useState('');

  /* ── 完了・お祝い画面 ── */
  if (step === 'celebrate' && result) {
    const cfg = CELEBRATE_CONFIG[result];
    return (
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-6 gap-5"
        style={{ background: cfg.screenBg }}
      >
        {/* 大きな結果バッジ */}
        <div
          className="mikke-mascot-in px-10 py-5 rounded-3xl"
          style={{
            background:  cfg.badgeBg,
            border:     `3px solid ${cfg.badgeBorder}`,
            boxShadow:  `0 8px 0 ${cfg.badgeShadow}`,
          }}
        >
          <p
            className="font-black text-[40px] leading-none"
            style={{ color: cfg.badgeText, letterSpacing: '-1px' }}
          >
            {cfg.label}
          </p>
        </div>

        {/* 機種画像（プレースホルダーはIPグラデ） */}
        {selectedMachine && (
          <div className="w-24 h-24 rounded-2xl"
            style={{ background: `linear-gradient(145deg, ${ipGradient(selectedMachine.ipName).from}, ${ipGradient(selectedMachine.ipName).to})`, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
        )}

        {/* テキスト */}
        <div className="text-center space-y-1">
          {itemName ? (
            <p className="text-[16px] font-black text-[#111]">{itemName}</p>
          ) : null}
          {selectedMachine && (
            <p className="text-[13px] text-[#888]">
              {selectedMachine.ipName} · {selectedMachine.seriesName}
            </p>
          )}
        </div>

        {/* CTA */}
        <div className="w-full mt-2 space-y-3">
          <button className="mikke-btn-yellow" onClick={() => navigateTo('home')}>
            フィードに投稿する
          </button>
          <button className="mikke-btn-ghost" style={{ width: '100%' }} onClick={() => navigateTo('home')}>
            スキップ
          </button>
        </div>
      </div>
    );
  }

  const stepNumber: 1 | 2 | 3 = step === 'machine' ? 1 : step === 'result' ? 2 : 3;
  const handleBack = () => {
    if (step === 'machine') goBack();
    else if (step === 'result') setStep('machine');
    else setStep('result');
  };

  return (
    <div className="absolute inset-0 bg-[#FFFEEF] flex flex-col">
      {/* ヘッダー */}
      <div className="flex-shrink-0 bg-white" style={{ borderBottom: '1.5px solid #EDE9D8' }}>
        <div className="flex items-center gap-3 px-4 pt-12 pb-2">
          <button
            className="w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0"
            style={{ background: '#F5F2E8' }}
            onClick={handleBack}
          >
            <ArrowLeft size={18} color="#444" />
          </button>
          <h1 className="font-black text-[18px] text-[#111]" style={{ letterSpacing: '-0.3px' }}>
            引いた！を記録する
          </h1>
        </div>
        <StepBar step={stepNumber} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* STEP 1: 機種選択 */}
        {step === 'machine' && (
          <>
            <p className="text-[13px] text-[#AAA] font-bold mb-3">どの機種を引いた？</p>
            <MachineList machines={machines} selected={selectedMachine} onSelect={setSelectedMachine} />
          </>
        )}

        {/* STEP 2: 結果選択 */}
        {step === 'result' && (
          <div className="space-y-3">
            <p className="text-[13px] text-[#AAA] font-bold mb-3">結果はどうだった？</p>
            {RESULT_OPTIONS.map((opt) => {
              const active = result === opt.value;
              return (
                <button
                  key={opt.value}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all"
                  style={{
                    background: active ? opt.bg   : 'white',
                    border:    `2px solid ${active ? opt.border : '#EDE9D8'}`,
                    boxShadow: `0 4px 0 ${active ? opt.shadow : '#E5E1CE'}`,
                  }}
                  onClick={() => setResult(opt.value)}
                >
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: opt.dot }} />
                  <div className="flex-1">
                    <p className="text-[17px] font-black" style={{ color: opt.color }}>{opt.label}</p>
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
          </div>
        )}

        {/* STEP 3: メモ */}
        {step === 'memo' && (
          <div className="space-y-5">
            <p className="text-[13px] text-[#AAA] font-bold">コメントを追加（任意）</p>

            <div className="space-y-2">
              <label className="text-[12px] font-bold text-[#666]">引いたアイテム名</label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="例：影山飛雄 アクリルスタンド"
                className="w-full px-4 py-3 rounded-2xl text-[14px] font-medium text-[#111] outline-none"
                style={{
                  background: 'white',
                  border: '2px solid #EDE9D8',
                  boxShadow: '0 2px 0 #E5E1CE',
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-bold text-[#666]">ひとことメモ</label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="例：ずっと狙ってたやつ引けた！！"
                rows={4}
                className="w-full px-4 py-3 rounded-2xl text-[14px] font-medium text-[#111] outline-none resize-none"
                style={{
                  background: 'white',
                  border: '2px solid #EDE9D8',
                  boxShadow: '0 2px 0 #E5E1CE',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* フッター CTA */}
      <div
        className="flex-shrink-0 px-4 pb-8 pt-3"
        style={{ borderTop: '1.5px solid #EDE9D8', background: '#FFFEEF' }}
      >
        {step === 'machine' && (
          <button className="mikke-btn-yellow" disabled={!selectedMachine} onClick={() => setStep('result')}>
            次へ
          </button>
        )}
        {step === 'result' && (
          <button className="mikke-btn-yellow" disabled={!result} onClick={() => setStep('memo')}>
            次へ
          </button>
        )}
        {step === 'memo' && (
          <div className="space-y-2.5">
            <button className="mikke-btn-yellow" onClick={() => setStep('celebrate')}>
              記録する
            </button>
            <button className="mikke-btn-ghost" style={{ width: '100%' }} onClick={() => setStep('celebrate')}>
              スキップ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
