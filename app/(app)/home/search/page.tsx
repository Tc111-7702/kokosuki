'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { HomeSearchBar } from '@/components/HomeSearchBar';
import { useIsMobile } from '@/lib/useIsMobile';

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
        {(isNew || isSoon) && (
          <div
            className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-white"
            style={{ fontSize: 9, fontWeight: 700, background: isNew ? '#F2B800' : '#aaa' }}
          >
            {isNew ? 'NEW' : 'SOON'}
          </div>
        )}
      </div>
      <div className="px-2 py-1.5">
        <p style={{ fontSize: 9, color: '#aaa', fontWeight: 600, marginBottom: 2 }}>{gacha.ipName}</p>
        <p style={{ fontSize: 11, color: '#222', fontWeight: 700, lineHeight: 1.3 }} className="line-clamp-2">
          {gacha.seriesName}
        </p>
      </div>
    </button>
  );
}

// ─── 人気IP（投稿サジェストと同じ取得・件数） ─────────────────────────────────

function PopularIpButtons({ isMobile }: { isMobile: boolean }) {
  const router = useRouter();
  const [ipNames, setIpNames] = useState<string[]>([]);
  const shownIps = ipNames.slice(0, isMobile ? 6 : 12);

  useEffect(() => {
    fetch('/api/gacha/popular-ips')
      .then(r => r.json())
      .then(d => setIpNames(d.ipNames ?? []))
      .catch(() => {});
  }, []);

  if (shownIps.length === 0) return null;

  return (
    <div>
      <p style={{ fontSize: 11, color: '#AAA', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>人気のIP</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {shownIps.map(ip => (
          <button
            key={ip}
            type="button"
            onClick={() => router.push(`/home/search?ipName=${encodeURIComponent(ip)}&label=${encodeURIComponent(ip)}`)}
            style={{
              padding: '5px 13px', borderRadius: 99, fontSize: 13, fontWeight: 600,
              border: '1.5px solid #EDE9D8', background: 'white', color: '#555',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {ip}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── メインコンテンツ（useSearchParams使用） ───────────────────────────────────

function SearchPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ipName = searchParams.get('ipName') ?? '';
  const label  = searchParams.get('label')  ?? ipName;
  const hasIpSearch = ipName.length > 0;

  const [gachas, setGachas]   = useState<GachaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!hasIpSearch) {
      queueMicrotask(() => { setGachas([]); setLoading(false); });
      return;
    }
    queueMicrotask(() => setLoading(true));
    fetch(`/api/gacha/genre?ipName=${encodeURIComponent(ipName)}`)
      .then(r => r.json())
      .then(data => { setGachas(data.gachas ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ipName, hasIpSearch]);

  const handleBack = () => {
    if (hasIpSearch) {
      router.replace('/home/search');
    } else {
      router.back();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FFFFFF]">
      <div
        className="flex-shrink-0 bg-white"
        style={{ borderBottom: '1.5px solid #EDE9D8', paddingTop: isMobile ? 48 : 16 }}
      >
        <div className="flex items-center gap-2 px-4 pb-2">
          <button
            type="button"
            onClick={handleBack}
            className="w-8 h-8 rounded-full flex items-center justify-center active:bg-gray-100"
            style={{ flexShrink: 0 }}
          >
            <ArrowLeft size={18} color="#555" />
          </button>
          <h1 style={{ fontSize: 15, fontWeight: 700, color: '#222' }}>
            {hasIpSearch ? label : 'さがす'}
          </h1>
        </div>
        <HomeSearchBar placeholder="別のガチャ名・ジャンルを検索…" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!hasIpSearch ? (
          <PopularIpButtons isMobile={isMobile} />
        ) : loading ? (
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

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageInner />
    </Suspense>
  );
}
