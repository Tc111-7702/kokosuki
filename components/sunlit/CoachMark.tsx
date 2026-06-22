'use client';

import { useState, useCallback } from 'react';

const sessionSeen = new Set<string>();

export interface CoachMarkStep {
  spotX: number;   // spotlight center X
  spotY: number;   // spotlight center Y
  spotW: number;   // spotlight width
  spotH: number;   // spotlight height
  spotR?: number;  // corner radius (default 14)
  title: string;
  body: string;
}

interface Props {
  id: string;
  steps: CoachMarkStep[];
  onDone?: () => void;
}

export function CoachMark({ id, steps, onDone }: Props) {
  const [step, setStep]       = useState(0);
  const [visible, setVisible] = useState(!sessionSeen.has(id));
  const [fading, setFading]   = useState(false);

  const dismiss = useCallback(() => {
    sessionSeen.add(id);
    setVisible(false);
    onDone?.();
  }, [id, onDone]);

  const advance = useCallback(() => {
    if (step >= steps.length - 1) { dismiss(); return; }
    setFading(true);
    setTimeout(() => {
      setStep(s => s + 1);
      setFading(false);
    }, 160);
  }, [step, steps.length, dismiss]);

  if (!visible) return null;

  const s      = steps[step];
  const r      = s.spotR ?? 14;
  const left   = s.spotX - s.spotW / 2;
  const top    = s.spotY - s.spotH / 2;
  const maskId = `cm-${id}`;

  return (
    <div
      className="absolute inset-0 z-50 mikke-coachmark-in"
      style={{ touchAction: 'none' }}
      onClick={dismiss}
    >
      {/* ── Dark overlay with rounded-rect spotlight cutout ── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          opacity: fading ? 0.3 : 1,
          transition: 'opacity 160ms ease',
        }}
      >
        <defs>
          <mask id={maskId}>
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={left} y={top}
              width={s.spotW} height={s.spotH}
              rx={r} ry={r}
              fill="black"
            />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.60)" mask={`url(#${maskId})`} />
      </svg>

      {/* ── White border around spotlight ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          left:   left - 3,
          top:    top  - 3,
          width:  s.spotW + 6,
          height: s.spotH + 6,
          borderRadius: r + 3,
          border: '2.5px solid rgba(255,255,255,0.9)',
          boxShadow: '0 0 12px rgba(255,205,49,0.45)',
          opacity: fading ? 0 : 1,
          transition: 'opacity 160ms ease',
        }}
      />

      {/* ── Bottom-sheet tooltip ── */}
      <div
        key={`card-${step}`}
        className="absolute left-0 right-0 bottom-0 mikke-coachmark-card-in"
        style={{
          background:   'white',
          borderRadius: '24px 24px 0 0',
          padding:      '20px 24px 28px',
          boxShadow:    '0 -4px 24px rgba(0,0,0,0.12)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Step dots */}
        {steps.length > 1 && (
          <div className="flex justify-center gap-2 mb-4">
            {steps.map((_, i) => (
              <div
                key={i}
                style={{
                  height: 4, borderRadius: 2,
                  width:      i === step ? 20 : 4,
                  background: i === step ? '#FFCD31' : '#E5E1CE',
                  transition: 'width 0.18s ease',
                }}
              />
            ))}
          </div>
        )}

        <p className="font-black text-[17px] leading-snug text-[#111] mb-2 text-center">
          {s.title}
        </p>
        <p className="text-[13px] leading-relaxed text-[#777] mb-5 text-center">
          {s.body}
        </p>

        <button className="mikke-btn-yellow" onClick={advance}>
          {step < steps.length - 1 ? '次へ' : 'わかった！'}
        </button>

        {step < steps.length - 1 && (
          <button
            className="w-full text-center mt-3"
            style={{ fontSize: 12, fontWeight: 700, color: '#C8C5BF' }}
            onClick={dismiss}
          >
            スキップ
          </button>
        )}
      </div>
    </div>
  );
}
