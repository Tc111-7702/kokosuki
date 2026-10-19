'use client';

import { useEffect, useState } from 'react';
import { useGachaDetail } from '@/components/GachaDetailProvider';
import { GachaStatusBadge } from '@/components/ui/GachaCard';
import { TrendingIpsSection } from '@/components/TrendingIpsSection';

type Item = {
  id: string;
  seriesName: string;
  imageUrl: string | null;
  gradientFrom: string;
  gradientTo: string;
  status: string;
  likeCount: number;
};

function RelatedSection({
  title,
  items,
  isDark,
  onOpen,
}: {
  title: string;
  items: Item[];
  isDark: boolean;
  onOpen: (id: string) => void;
}) {
  if (items.length === 0) return null;
  const border = isDark ? '#262626' : '#EDE9D8';
  const nameColor = isDark ? '#FFFFFF' : '#1A1A1A';
  return (
    <div style={{ background: isDark ? '#0a0a0a' : '#FFFFFF', border: '1px solid ' + border, borderRadius: 16, overflow: 'hidden' }}>
      <p style={{ fontSize: 14, fontWeight: 800, color: nameColor, margin: 0, padding: '12px 14px', borderBottom: '1px solid ' + border }}>
        {title}
      </p>
      {items.map((g, i) => (
        <button
          key={g.id}
          type="button"
          onClick={() => onOpen(g.id)}
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
            {g.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- 任意ホストのガチャ画像
              <img src={g.imageUrl} alt={g.seriesName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            )}
          </div>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: nameColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {g.seriesName}
          </span>
          <GachaStatusBadge status={g.status} isMobile />
        </button>
      ))}
    </div>
  );
}

/**
 * 発売予定ページの右サイドリスト。
 * - 同一IP（タイトル=IP名）の発売中ガチャ上位5件（いいね順・発売状況タグ付き）。
 *   IPが不明な場合は、代わりにホーム投稿一覧と同じ「話題のIP」を差し込む。
 * - 今週発売上位3件（いいね順）。タイトルはデスクトップ右サイド用の「今週発売」。
 * クリックでそのガチャのガチャ詳細に切り替える（openGacha）。
 *
 * gachaId 変更時は key でリマウントして状態を初期化する（effect 内の同期 setState を避ける）。
 */
export function GachaRelatedLists({ gachaId, isDark }: { gachaId: string; isDark: boolean }) {
  return <GachaRelatedListsInner key={gachaId} gachaId={gachaId} isDark={isDark} />;
}

function GachaRelatedListsInner({ gachaId, isDark }: { gachaId: string; isDark: boolean }) {
  const { openGacha } = useGachaDetail();
  const [ipName, setIpName] = useState('');
  const [ipGachas, setIpGachas] = useState<Item[]>([]);
  const [weeklyGachas, setWeeklyGachas] = useState<Item[]>([]);

  useEffect(() => {
    let alive = true;
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* IPが判明していればそのIPのガチャ一覧、不明ならホームと同じ「話題のIP」を差し込む */}
      {ipName ? (
        <RelatedSection title={ipName} items={ipGachas} isDark={isDark} onOpen={openGacha} />
      ) : (
        <TrendingIpsSection />
      )}
      <RelatedSection title="今週発売" items={weeklyGachas} isDark={isDark} onOpen={openGacha} />
    </div>
  );
}
