'use client';

import { useEffect, useState } from 'react';
import { useGachaDetail } from '@/components/GachaDetailProvider';
import { GachaStatusBadge } from '@/components/ui/GachaCard';

type Item = {
  id: string;
  seriesName: string;
  imageUrl: string | null;
  gradientFrom: string;
  gradientTo: string;
  status: string;
  likeCount: number;
};

/**
 * 発売予定ページの右サイドリスト。
 * - 同一IP（タイトル=IP名）のガチャ上位5件（いいね順・発売状況タグ付き）
 * - 今週発売のガチャ上位3件（いいね順）
 * クリックでそのガチャのガチャ詳細に切り替える（openGacha）。
 */
export function GachaRelatedLists({ gachaId, isDark }: { gachaId: string; isDark: boolean }) {
  const { openGacha } = useGachaDetail();
  const [ipName, setIpName] = useState('');
  const [ipGachas, setIpGachas] = useState<Item[]>([]);
  const [weeklyGachas, setWeeklyGachas] = useState<Item[]>([]);

  useEffect(() => {
    let alive = true;
    setIpName(''); setIpGachas([]); setWeeklyGachas([]);
    fetch('/api/gacha/' + gachaId + '/related')
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setIpName(d.ipName ?? '');
        setIpGachas(d.ipGachas ?? []);
        setWeeklyGachas(d.weeklyGachas ?? []);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [gachaId]);

  const border = isDark ? '#262626' : '#EDE9D8';
  const nameColor = isDark ? '#FFFFFF' : '#1A1A1A';

  const Section = ({ title, items }: { title: string; items: Item[] }) => {
    if (items.length === 0) return null;
    return (
      <div style={{ background: isDark ? '#0a0a0a' : '#FFFFFF', border: '1px solid ' + border, borderRadius: 16, overflow: 'hidden' }}>
        <p style={{ fontSize: 14, fontWeight: 800, color: nameColor, margin: 0, padding: '12px 14px', borderBottom: '1px solid ' + border }}>
          {title}
        </p>
        {items.map((g, i) => (
          <button
            key={g.id}
            type="button"
            onClick={() => openGacha(g.id)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              border: 'none', borderTop: i > 0 ? '1px solid ' + border : 'none',
              background: 'transparent', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
              background: 'linear-gradient(135deg, ' + g.gradientFrom + ', ' + g.gradientTo + ')',
            }}>
              {g.imageUrl && <img src={g.imageUrl} alt={g.seriesName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
            </div>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: nameColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {g.seriesName}
            </span>
            <GachaStatusBadge status={g.status} isMobile />
          </button>
        ))}
      </div>
    );
  };

  if (ipGachas.length === 0 && weeklyGachas.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {ipName && <Section title={ipName} items={ipGachas} />}
      <Section title="今週発売のガチャ" items={weeklyGachas} />
    </div>
  );
}
