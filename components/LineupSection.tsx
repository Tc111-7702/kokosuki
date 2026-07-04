'use client';

import type { GachaDetail } from '@/components/gacha-types';

export function LineupSection({ gacha }: { gacha: GachaDetail }) {
  return (
    <div>
      <p style={{ fontSize: 13, fontWeight: 800, color: '#555', marginBottom: 10, letterSpacing: '0.05em' }}>
        ほしい物を選ぶ
      </p>
      {gacha.lineup && gacha.lineup.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {gacha.lineup.map((item) => (
            <button key={item} style={{
              padding: '7px 14px', borderRadius: 20, border: '1.5px solid #E5E5E5',
              background: '#fff', fontSize: 13, fontWeight: 600, color: '#333',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = gacha.gradientFrom; e.currentTarget.style.color = gacha.gradientFrom; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E5E5E5'; e.currentTarget.style.color = '#333'; }}
            >{item}</button>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: '#AAA', fontStyle: 'italic' }}>
          ラインアップ不明
        </p>
      )}
    </div>
  );
}
