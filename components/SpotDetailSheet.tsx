'use client';

import { useRef, useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { X, MapPin, Navigation, Phone, ChevronRight } from 'lucide-react';
import { ipGradient } from '@/components/SpotGachaCard';
import { GachaCard, type GachaItem } from '@/components/ui/GachaCard';
import { ReplyComposerField } from '@/components/ReplyComposerField';
import NavPickerModal from '@/components/NavPickerModal';
import { Avatar } from '@/components/ui/Avatar';
import { useIsMobile } from '@/lib/useIsMobile';
import { getThemeSnapshot, subscribeTheme } from '@/lib/appThemeStore';
import { DESKTOP_PAGE_NAV_WIDTH } from '@/lib/desktopPageNav';

type SheetReview = {
  id: string;
  text: string;
  createdAt: string;
  user: { id: string; name: string; image: string | null };
  _count: { likes: number; replies: number };
};

export interface SpotDetail {
  lat: number; lng: number; id: string; name: string; address: string;
  distance: number; phone?: string | null; googleMapsUrl: string | null;
  gachaIds: string[]; stockMap: Record<string, string>;
}
export interface GachaInfo {
  id: string; seriesName: string; ipName: string; imageUrl: string | null;
}
interface SpotDetailSheetProps {
  spot: SpotDetail | null;
  gachaMap: Map<string, GachaInfo>;
  filterGachaIds: string[];
  searchOverrideIds?: string[] | null;
  searchLabel?: string | null;
  highlightGachaId?: string;
  currentPos?: { lat: number; lng: number } | null;
  onClose: () => void;
  onClearFilter?: () => void;
  onOpenFilter?: () => void;
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
function fmtDistance(m: number): string {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

function toGachaItem(g: GachaInfo): GachaItem {
  const [gradientFrom, gradientTo] = ipGradient(g.ipName);
  return {
    id: g.id,
    seriesName: g.seriesName,
    ipName: g.ipName,
    imageUrl: g.imageUrl,
    gradientFrom,
    gradientTo,
    likeCount: 0,
    status: 'on_sale',
    releaseDate: null,
  };
}

export default function SpotDetailSheet({
  spot, gachaMap, filterGachaIds, searchOverrideIds, searchLabel,
  highlightGachaId, currentPos, onClose, onClearFilter, onOpenFilter,
}: SpotDetailSheetProps) {
  const router = useRouter();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [navOpen,     setNavOpen]     = useState(false);
  const MOBILE_BREAKPOINT = 768;
  const NARROW_BREAKPOINT = 341;
  const isMobile = useIsMobile(MOBILE_BREAKPOINT);
  const isNarrow = useIsMobile(NARROW_BREAKPOINT);
  const isDark = useSyncExternalStore(
    subscribeTheme,
    () => getThemeSnapshot() === 'dark',
    () => false,
  );
  const storeNameColor = isDark ? '#FFFFFF' : '#1a1a1a';
  const sheetSectionBg = isDark ? '#0a0a0a' : '#FAFAFA';
  const sheetBorderColor = isDark ? '#262626' : '#F0F0F0';
  const sheetMutedColor = isDark ? '#737373' : '#888888';
  const [expanded,    setExpanded]    = useState(false);
  const dragStartY = useRef<number | null>(null);
  const [reviews,     setReviews]     = useState<SheetReview[]>([]);
  const [reviewText,  setReviewText]  = useState('');
  const [submittingR, setSubmittingR] = useState(false);
  const reviewTextareaRef = useRef<HTMLTextAreaElement>(null);
  // 在庫報告の距離判定は、渡された currentPos ではなく「カードを開いた時にその場で取り直した
  // 現在地」で行う。マップ上のクリック等で偽装した位置での不正な在庫報告を防ぐため。
  const [freshPos, setFreshPos] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => { setExpanded(false); setReviews([]); setReviewText(''); }, [spot?.id]);

  // カードを開く（spot が変わる）たびに現在地を取り直す。maximumAge:0 でキャッシュを使わず必ず新規取得。
  useEffect(() => {
    if (!spot) return;
    setFreshPos(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (p) => { if (!cancelled) setFreshPos({ lat: p.coords.latitude, lng: p.coords.longitude }); },
      () => { /* 取得失敗（許可拒否・タイムアウト等）時は freshPos=null のまま＝在庫報告は不可（安全側） */ },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );
    return () => { cancelled = true; };
  }, [spot?.id]);

  useEffect(() => {
    if (!spot) return;
    let cancelled = false;
    fetch(`/api/spots/${spot.id}/reviews?skip=0&take=3`)
      .then(r => r.json())
      .then((d: { items: SheetReview[] }) => { if (!cancelled) setReviews(d.items ?? []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [spot?.id]);

  const handleReviewSubmit = useCallback(async () => {
    if (!spot || !reviewText.trim() || submittingR) return;
    setSubmittingR(true);
    try {
      const res = await fetch(`/api/spots/${spot.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: reviewText.trim() }),
      });
      if (res.ok) {
        const data: { review: SheetReview } = await res.json();
        setReviews(prev => [data.review, ...prev].slice(0, 3));
        setReviewText('');
      }
    } finally { setSubmittingR(false); }
  }, [spot, reviewText, submittingR]);

  if (!spot) return null;

  const searchSet = searchOverrideIds ? new Set(searchOverrideIds) : null;
  const allMatchedGacha = spot.gachaIds
    .filter(id => {
      if (searchSet != null) return searchSet.has(id) || filterGachaIds.length === 0 || filterGachaIds.includes(id);
      return filterGachaIds.length === 0 || filterGachaIds.includes(id);
    })
    .map(id => gachaMap.get(id))
    .filter((g): g is GachaInfo => g !== undefined)
    .sort((a, b) => {
      if (searchSet != null) {
        const aS = searchSet.has(a.id), bS = searchSet.has(b.id);
        if (aS && !bS) return -1; if (!aS && bS) return 1;
      }
      if (highlightGachaId) {
        if (a.id === highlightGachaId) return -1;
        if (b.id === highlightGachaId) return 1;
      }
      return 0;
    });
  const matchedGacha = allMatchedGacha.slice(0, 10);
  const knownCount   = matchedGacha.filter(g => spot.stockMap[g.id]).length;
  const isSearchMode = searchOverrideIds != null;
  const isEmpty      = matchedGacha.length === 0;
  // 距離は「その場で取り直した現在地(freshPos)」だけで計算する。渡された currentPos は
  // 偽装され得るためここでは使わない。fresh が無いときの表示のみ、サーバー算出の
  // spot.distance にフォールバックする（表示が空にならないように）。
  const freshDistanceM = freshPos ? haversineM(freshPos.lat, freshPos.lng, spot.lat, spot.lng) : null;
  const distanceM    = freshDistanceM ?? spot.distance;
  const distText     = fmtDistance(distanceM);
  // 在庫報告の可否は freshPos のみで厳密判定。未取得・許可拒否・失敗時は報告不可。
  const tooFarForStock = freshDistanceM === null || freshDistanceM > 500;

  // デスクトップはボトムナビがないので bottom: 0、モバイルは bottom: 64
  const bottomOffset = isMobile ? 64 : 0;
  const mainAreaLeft = isMobile ? 0 : DESKTOP_PAGE_NAV_WIDTH;

  return (
    <>
      <div className="fixed z-40"
        style={{ top: 0, right: 0, bottom: bottomOffset, left: mainAreaLeft, background: 'rgba(0,0,0,0.25)' }}
        onClick={onClose} />
      <div ref={sheetRef} data-spot-sheet="1" className="fixed right-0 z-50 flex flex-col min-w-0 overflow-hidden"
        style={{
          left: mainAreaLeft,
          bottom: bottomOffset,
          background: 'white',
          borderRadius: '20px 20px 0 0',
          maxHeight: expanded ? '90vh' : '46vh',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
          transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}>

        {/* ドラッグハンドル */}
        <div
          className="flex justify-center pt-3 pb-1 flex-shrink-0 cursor-pointer select-none"
          onWheel={e => {
            if (e.deltaY < 0 && expanded)  setExpanded(false);
            if (e.deltaY > 0 && !expanded) setExpanded(true);
          }}
          onPointerDown={e => {
            dragStartY.current = e.clientY;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={e => {
            if (dragStartY.current === null) return;
            const dy = e.clientY - dragStartY.current;
            if (dy > 40 && expanded)  { setExpanded(false); dragStartY.current = null; }
            if (dy < -40 && !expanded){ setExpanded(true);  dragStartY.current = null; }
          }}
          onPointerUp={e => {
            if (dragStartY.current !== null) {
              const dy = e.clientY - dragStartY.current;
              if (Math.abs(dy) < 8) setExpanded(v => !v);
              dragStartY.current = null;
            }
          }}
        >
          <div style={{ width: 40, height: 4, borderRadius: 2, background: expanded ? '#C8C8C8' : '#F2B800' }} />
        </div>

        {/* 店舗名・住所ヘッダー */}
        <div
          className="flex items-start justify-between px-4 pt-2 pb-3 flex-shrink-0"
          style={{ cursor: expanded ? 'default' : 'pointer' }}
          onWheel={e => {
            if (e.deltaY < 0 && expanded)  setExpanded(false);
            if (e.deltaY > 0 && !expanded) setExpanded(true);
          }}
          onPointerDown={e => {
            if ((e.target as HTMLElement).closest('button')) return;
            dragStartY.current = e.clientY;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={e => {
            if (dragStartY.current === null) return;
            const dy = e.clientY - dragStartY.current;
            if (dy > 40 && expanded)  { setExpanded(false); dragStartY.current = null; }
            if (dy < -40 && !expanded){ setExpanded(true);  dragStartY.current = null; }
          }}
          onPointerUp={() => { dragStartY.current = null; }}
        >
          <div className="flex-1 min-w-0 pr-2">
            <h2 className="text-[16px] md:text-[18px] font-black leading-tight" style={{ color: storeNameColor }}>{spot.name}</h2>
            <div className="flex items-center gap-1 mt-1">
              <MapPin size={12} color="#aaa" />
              <p className="text-[12px] truncate" style={{ color: '#888' }}>{spot.address}</p>
            </div>
            <p className="text-[12px] font-semibold mt-1" style={{ color: '#0891b2' }}>
              現在地から {distText}
            </p>
          </div>
          <button onClick={onClose} className="p-1 flex-shrink-0">
            <X size={22} color="#555" />
          </button>
        </div>

        <div
          className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden"
          style={{ minHeight: 0 }}
          onScroll={e => { if ((e.currentTarget as HTMLDivElement).scrollTop > 0 && !expanded) setExpanded(true); }}
          onWheel={e => {
            const el = e.currentTarget as HTMLDivElement;
            if (el.scrollTop === 0 && e.deltaY < 0 && expanded) setExpanded(false);
          }}
        >
          <div className="px-4 py-2 text-[13px] font-bold flex items-center justify-between"
            style={{ color: sheetMutedColor, background: sheetSectionBg, borderBottom: `1px solid ${sheetBorderColor}` }}>
            <span>{isSearchMode ? '検索結果' : '取扱商品'} {isEmpty ? 0 : matchedGacha.length}件</span>
            <div className="flex items-center gap-2">
              {knownCount > 0 && (
                <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 600 }}>在庫情報あり {knownCount}件</span>
              )}
              {!isSearchMode && (
                filterGachaIds.length > 0 && onClearFilter ? (
                  <button onClick={onClearFilter} style={{ fontSize: 10, fontWeight: 700, color: '#F2B800', background: '#FFF8E1', border: '1px solid #F2B800', borderRadius: 99, padding: '2px 8px', cursor: 'pointer' }}>フィルター解除</button>
                ) : onOpenFilter ? (
                  <button onClick={onOpenFilter} style={{ fontSize: 10, fontWeight: 700, color: '#888', background: '#F5F3ED', border: '1px solid #E0E0E0', borderRadius: 99, padding: '2px 8px', cursor: 'pointer' }}>フィルター</button>
                ) : null
              )}
            </div>
          </div>

          {isEmpty ? (
            <div className="py-10 text-center">
              <p style={{ fontSize: 14, color: '#aaa' }}>
                {isSearchMode ? 'このガチャ/ジャンルは取り扱いがありません' : '商品情報がありません'}
              </p>
            </div>
          ) : (
            <>
              {isMobile && matchedGacha.length > 2 && (
                <style>{`
                  .spot-gacha-scroll::-webkit-scrollbar { display: none; }
                `}</style>
              )}
              <div
                className={isMobile && matchedGacha.length > 2 ? 'spot-gacha-scroll' : ''}
                style={{
                  display: 'flex', gap: isMobile ? 12 : 32,
                  padding: isMobile ? '10px 16px 6px' : '12px 16px',
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                }}
              >
                {matchedGacha.map((g, rank) => (
                  <GachaCard
                    key={g.id}
                    gacha={toGachaItem(g)}
                    rank={rank}
                    showRank={false}
                    isMobile={isMobile}
                    narrow={isNarrow}
                    variant="favorite"
                    stockStatus={spot.stockMap[g.id] ?? null}
                    highlight={searchSet != null && searchSet.has(g.id)}
                  />
                ))}
              </div>
            </>
          )}

          <div className={`px-4 text-[13px] font-bold ${isMobile ? 'py-1.5 mt-1' : 'py-2 mt-2'}`}
            style={{ color: sheetMutedColor, background: sheetSectionBg, borderBottom: `1px solid ${sheetBorderColor}` }}>
            口コミ
          </div>
          {/* 口コミ投稿欄 */}
          <div className={`min-w-0 px-4 ${isMobile ? 'pt-2.5 pb-4' : 'pt-3 pb-2'}`}>
            <ReplyComposerField
              text={reviewText}
              textareaRef={reviewTextareaRef}
              onChange={e => setReviewText(e.target.value)}
              onSelect={() => {}}
              onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleReviewSubmit(); } }}
              renderMentionText={t => t}
              onSubmit={handleReviewSubmit}
              submitting={submittingR}
              placeholder="この店舗の口コミ・質問を書く..."
              variant="inline"
              plainText
            />
          </div>
          {/* 口コミ一覧 (最大3件) */}
          {reviews.length > 0 && (
            <div className="min-w-0 px-4 pb-3 flex flex-col gap-2">
              {reviews.map(rv => (
                <div key={rv.id} className="flex gap-2.5 min-w-0">
                  <Avatar user={rv.user} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[12px] font-bold" style={{ color: '#333' }}>{rv.user.name}</span>
                      <span className="text-[11px]" style={{ color: '#aaa' }}>
                        {new Date(rv.createdAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-[13px] leading-snug whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word] min-w-0 max-w-full" style={{ color: '#444' }}>{rv.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="px-4 pb-2 pt-3">
            <button
              onClick={() => {
                const base = '/store/' + spot.id;
                const params = new URLSearchParams();
                if (searchLabel) params.set('contentSearch', searchLabel);
                if (filterGachaIds.length === 0) params.set('noFilter', '1');
                const qs = params.toString();
                router.push(qs ? `${base}?${qs}` : base);
              }}
              className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[13px] font-bold active:scale-95 transition-transform${isDark ? ' map-list-toggle-btn' : ''}`}
              style={isDark
                ? { cursor: 'pointer' }
                : { background: '#F5F3ED', color: '#555555', border: 'none', cursor: 'pointer' }}>
              店舗の詳細を確認する<ChevronRight size={15} />
            </button>
          </div>

          <div className={`flex px-4 pb-6 pt-3 ${isMobile ? 'gap-1.5' : 'gap-2'}`} style={{ borderTop: `1px solid ${sheetBorderColor}` }}>
            <button onClick={() => setNavOpen(true)}
              className={`flex shrink-0 items-center justify-center gap-1 rounded-2xl font-bold ${isMobile ? 'px-3.5 py-2.5 text-[11px]' : 'px-4 py-2.5 text-[14px]'}`}
              style={{ background: '#E8F4FD', color: '#0891b2', minWidth: isMobile ? undefined : 72 }}>
              {!isMobile && <Navigation size={15} />}経路
            </button>
            {spot.phone && (
              <a href={'tel:' + spot.phone.replace(/[^\d+]/g, '')}
                aria-label="電話"
                className={`flex shrink-0 items-center justify-center rounded-2xl font-bold ${isMobile ? 'px-2.5 py-2.5' : 'gap-1 px-4 py-2.5 text-[14px]'}`}
                style={{ background: '#E8F5E9', color: '#16a34a', minWidth: isMobile ? undefined : 72, textDecoration: 'none' }}>
                {isMobile ? <Phone size={16} /> : <><Phone size={15} />電話</>}
              </a>
            )}
            <button
              disabled={isEmpty || tooFarForStock}
              onClick={() => router.push(`/post?mode=stock&spotId=${spot.id}&spotName=${encodeURIComponent(spot.name)}&filterGachaIds=${filterGachaIds.join(',')}${searchLabel ? `&contentSearch=${encodeURIComponent(searchLabel)}` : ''}`)}
              className={`stock-report-btn min-w-0 flex-1 rounded-2xl font-bold ${isMobile ? 'px-2 py-2.5 text-[12px]' : 'py-2.5 text-[14px]'}`}
              style={{ background: '#F5F3ED', color: '#555', opacity: isEmpty || tooFarForStock ? 0.4 : 1, cursor: isEmpty || tooFarForStock ? 'not-allowed' : 'pointer' }}>
              在庫を報告
            </button>
            <button
              disabled={isEmpty}
              onClick={() => router.push(`/post?mode=pull&spotId=${spot.id}&spotName=${encodeURIComponent(spot.name)}&filterGachaIds=${filterGachaIds.join(',')}${searchLabel ? `&contentSearch=${encodeURIComponent(searchLabel)}` : ''}`)}
              className={`min-w-0 flex-1 rounded-2xl font-bold ${isMobile ? 'px-1.5 py-2.5 text-[12px]' : 'py-2.5 text-[14px]'}`}
              style={{ background: '#F2B800', color: 'white', opacity: isEmpty ? 0.4 : 1, cursor: isEmpty ? 'not-allowed' : 'pointer' }}>
              引いた！
            </button>
          </div>
        </div>
      </div>
      {navOpen && <NavPickerModal lat={spot.lat} lng={spot.lng} name={spot.name} currentPos={currentPos ?? null} onClose={() => setNavOpen(false)} />}
    </>
  );
}
