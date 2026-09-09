'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { HomeSearchBar } from '@/components/HomeSearchBar';
import { GachaCard, type GachaItem } from '@/components/ui/GachaCard';
import { useIsMobile } from '@/lib/useIsMobile';
import {
  MOBILE_HEADER_PADDING_TOP,
  MOBILE_HEADER_TITLE_ROW_HEIGHT,
  MOBILE_HEADER_SEARCH_BAR_HEIGHT,
} from '@/lib/mobileHeaderLayout';

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
  const cols = isMobile ? 2 : 4;

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
        style={{ borderBottom: '1.5px solid #EDE9D8', paddingTop: isMobile ? MOBILE_HEADER_PADDING_TOP : 16 }}
      >
        {isMobile ? (
          <>
            <div
              className="flex items-center gap-2 px-4"
              style={{ height: MOBILE_HEADER_TITLE_ROW_HEIGHT }}
            >
              <button
                type="button"
                onClick={handleBack}
                className="w-8 h-8 rounded-full flex items-center justify-center active:bg-gray-100"
                style={{ flexShrink: 0 }}
              >
                <ArrowLeft size={18} color="#555" />
              </button>
              <h1 style={{ fontSize: 15, fontWeight: 700, color: '#222', lineHeight: 1 }}>
                {hasIpSearch ? label : 'ガチャ・IPをしらべる'}
              </h1>
            </div>
            <div style={{ height: MOBILE_HEADER_SEARCH_BAR_HEIGHT }}>
              <HomeSearchBar />
            </div>
          </>
        ) : (
          <>
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
                {hasIpSearch ? label : 'ガチャ・IPをしらべる'}
              </h1>
            </div>
            <HomeSearchBar />
          </>
        )}
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
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gap: 12,
              }}
            >
              {gachas.map((g, rank) => (
                <GachaCard
                  key={g.id}
                  gacha={g}
                  rank={rank}
                  showRank={false}
                  isMobile={isMobile}
                  variant="favorite"
                  fullWidth
                />
              ))}
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
