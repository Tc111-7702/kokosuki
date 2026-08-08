'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { HomeSearchBar } from '@/components/HomeSearchBar';

// ─── 型 ──────────────────────────────────────────────────────────────────────

interface GachaItem {
  id: string;
  seriesName: string;
  ipName: string;
  imageUrl: string | null;
  gradientFrom: string;
  gradientTo: string;
  status: string;
  releaseDate: string | null;
  likeCount: number;
}

// ─── カード ───────────────────────────────────────────────────────────────────

function GachaGridCard({ gacha }: { gacha: GachaItem }) {
  const router = useRouter();
  const isNew = gacha.status === 'new';
  const isSoon = gacha.status === 'coming_soon';

  return (
    <button
      onClick={() => router.push(`/gacha/${gacha.id}`)}
      className="flex flex-col rounded-2xl overflow-hidden active:scale-95 transition-transform text-left"
      style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
    >
      {/* 画像エリア（正方形） */}
      <div className="relative w-full" style={{ paddingBottom: '100%' }}>
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${gacha.gradientFrom}, ${gacha.gradientTo})` }}
        />
        {gacha.imageUrl && (
          <img
            src={gacha.imageUrl}
            alt={gacha.seriesName}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {/* ステータスバッジ */}
        {(isNew || isSoon) && (
          <div
            className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-white"
            style={{ fontSize: 9, fontWeight: 700, background: isNew ? '#F2B800' : '#aaa' }}
          >
            {isNew ? 'NEW' : 'SOON'}
          </div>
        )}
      </div>
      {/* テキストエリア */}
      <div className="px-2 py-1.5">
        <p style={{ fontSize: 9, color: '#aaa', fontWeight: 600, marginBottom: 2 }}>{gacha.ipName}</p>
        <p style={{ fontSize: 11, color: '#222', fontWeight: 700, lineHeight: 1.3 }} className="line-clamp-2">
          {gacha.seriesName}
        </p>
      </div>
    </button>
  );
}

// ─── メインコンテンツ（useSearchParams使用） ───────────────────────────────────

function GenrePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ipName = searchParams.get('ipName') ?? '';
  const label  = searchParams.get('label')  ?? ipName;

  const [gachas, setGachas]   = useState<GachaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!ipName) { queueMicrotask(() => setLoading(false)); return; }
    queueMicrotask(() => setLoading(true));
    fetch(`/api/gacha/genre?ipName=${encodeURIComponent(ipName)}`)
      .then(r => r.json())
      .then(data => { setGachas(data.gachas ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ipName]);

  return (
    <div className="flex flex-col h-full bg-[#FFFEEF]">
      {/* ヘッダー */}
      <div
        className="flex-shrink-0 bg-white"
        style={{ borderBottom: '1.5px solid #EDE9D8', paddingTop: isMobile ? 48 : 16 }}
      >
        <div className="flex items-center gap-2 px-4 pb-2">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-full flex items-center justify-center active:bg-gray-100"
            style={{ flexShrink: 0 }}
          >
            <ArrowLeft size={18} color="#555" />
          </button>
          <h1 style={{ fontSize: 15, fontWeight: 700, color: '#222' }}>{label}</h1>
        </div>
        <HomeSearchBar placeholder="別のガチャ名・ジャンルを検索…" />
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div style={{ width: 32, height: 32, border: '3px solid #F2B800', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : gachas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <p style={{ fontSize: 14, color: '#aaa' }}>ガチャが見つかりませんでした</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 11, color: '#999', marginBottom: 12 }}>{gachas.length}件</p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                gap: 12,
              }}
            >
              {gachas.map(g => <GachaGridCard key={g.id} gacha={g} />)}
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── エクスポート（Suspenseラップ必須） ───────────────────────────────────────

export default function GenrePage() {
  return (
    <Suspense>
      <GenrePageInner />
    </Suspense>
  );
}
