'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { NormalPostForm, DesktopNormalForm } from '@/components/NormalPostForm';
import { StockPostForm,  DesktopStockForm  } from '@/components/StockPostForm';
import { useIsMobile } from '@/lib/useIsMobile';

type PostType = 'normal' | 'stock';

// ─── デスクトップ：タブ切り替え ───────────────────────────────────────────

function DesktopPostPage({ initialMode, initialSpotId, initialSpotName, initialFilterGachaIds, initialSearch }: {
  initialMode: string | null;
  initialSpotId: string;
  initialSpotName: string;
  initialFilterGachaIds: string[];
  initialSearch: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<PostType>(initialMode === 'stock' ? 'stock' : 'normal');
  const handleDone = () => router.push('/home?tab=community&posted=1');

  const TABS: { key: PostType; label: string; accent: string }[] = [
    { key: 'normal', label: '引いた！',   accent: '#F2B800' },
    { key: 'stock',  label: '在庫を報告', accent: '#60A5FA' },
  ];

  const bg = tab === 'stock' ? '#F3F4F6' : '#FFFEEF';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: bg }}>
      <div style={{
        flexShrink: 0, background: 'white', borderBottom: '1.5px solid #EDE9D8',
        display: 'flex', gap: 0, justifyContent: 'center', position: 'relative',
      }}>
        {initialMode && (
          <button onClick={() => router.back()}
            style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'none', border: 'none', cursor: 'pointer', padding: 8,
              color: '#888', fontSize: 14, fontWeight: 700,
            }}>
            <ChevronLeft size={20} />戻る
          </button>
        )}
        {TABS.map(t => {
          const locked = !!initialMode && t.key !== tab;
          return (
            <button key={t.key} onClick={() => { if (!locked) setTab(t.key); }}
              style={{
                padding: '14px 48px', background: 'none', border: 'none',
                cursor: locked ? 'not-allowed' : 'pointer',
                fontSize: 15, fontWeight: 800,
                color: tab === t.key ? '#1A1A1A' : '#DDD',
                borderBottom: tab === t.key ? `3px solid ${t.accent}` : '3px solid transparent',
                transition: 'color 0.15s, border-color 0.15s',
                opacity: locked ? 0.4 : 1,
              }}>
              {t.label}
            </button>
          );
        })}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'normal'
          ? <DesktopNormalForm onDone={handleDone} initialSpotId={initialSpotId} initialSpotName={initialSpotName} initialFilterGachaIds={initialFilterGachaIds} initialSearch={initialSearch} />
          : <DesktopStockForm  onDone={handleDone} initialSpotId={initialSpotId} initialSpotName={initialSpotName} initialFilterGachaIds={initialFilterGachaIds} initialSearch={initialSearch} />
        }
      </div>
    </div>
  );
}

// ─── モバイル：タイプ選択 → フォーム ─────────────────────────────────────

function MobilePostPage({ initialMode, initialSpotId, initialSpotName, initialFilterGachaIds, initialSearch }: {
  initialMode: string | null;
  initialSpotId: string;
  initialSpotName: string;
  initialFilterGachaIds: string[];
  initialSearch: string;
}) {
  const router = useRouter();
  const [postType, setPostType] = useState<PostType | null>(
    initialMode === 'pull' ? 'normal' : initialMode === 'stock' ? 'stock' : null
  );
  const handleDone = () => router.push('/home?tab=community&posted=1');

  if (!postType) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#FFFEEF' }}>
        <div style={{
          flexShrink: 0, background: 'white', borderBottom: '1.5px solid #EDE9D8',
          padding: '14px 16px', display: 'flex', alignItems: 'center',
        }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#1A1A1A' }}>投稿する</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px' }}>
          <p style={{ fontSize: 13, color: '#AAA', marginBottom: 20, textAlign: 'center' }}>
            投稿タイプを選んでください
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 480, margin: '0 auto' }}>
            <button
              onClick={() => setPostType('normal')}
              style={{
                padding: '22px 24px', borderRadius: 20, border: '2px solid #F2B800',
                background: '#F2B800', cursor: 'pointer', textAlign: 'left',
                boxShadow: '0 2px 12px rgba(242,184,0,0.25)', transition: 'opacity 0.15s',
              }}>
              <p style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, color: '#1A1A1A' }}>引いた！</p>
              <p style={{ margin: 0, fontSize: 13, color: '#7A5F00', lineHeight: 1.5 }}>ガチャ結果・当たりアイテムを投稿</p>
            </button>
            <button
              onClick={() => setPostType('stock')}
              style={{
                padding: '22px 24px', borderRadius: 20, border: '2px solid #D1D5DB',
                background: '#F3F4F6', cursor: 'pointer', textAlign: 'left',
                boxShadow: '0 2px 12px rgba(0,0,0,0.05)', transition: 'border-color 0.15s, background 0.15s',
              }}>
              <p style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, color: '#1A1A1A' }}>在庫を報告</p>
              <p style={{ margin: 0, fontSize: 13, color: '#6B7280', lineHeight: 1.5 }}>ガチャ機の在庫状況を共有</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isNormal = postType === 'normal';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: isNormal ? '#FFFEEF' : '#F3F4F6' }}>
      <div style={{
        flexShrink: 0, background: 'white', borderBottom: '1.5px solid #EDE9D8',
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <button onClick={() => { if (initialMode) router.back(); else setPostType(null); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
          <ChevronLeft size={22} color="#888" />
        </button>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#1A1A1A' }}>
          {isNormal ? '引いた！' : '在庫を報告'}
        </span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isNormal
          ? <NormalPostForm onDone={handleDone} initialSpotId={initialSpotId} initialSpotName={initialSpotName} initialFilterGachaIds={initialFilterGachaIds} initialSearch={initialSearch} />
          : <StockPostForm  onDone={handleDone} initialSpotId={initialSpotId} initialSpotName={initialSpotName} initialFilterGachaIds={initialFilterGachaIds} initialSearch={initialSearch} />
        }
      </div>
    </div>
  );
}

// ─── searchParams を読む内部コンポーネント ────────────────────────────────

function PostPageContent() {
  const searchParams = useSearchParams();
  const mode      = searchParams.get('mode');                        // 'pull' | 'stock' | null
  const spotId    = searchParams.get('spotId')    ?? '';
  const spotName  = searchParams.get('spotName')  ?? '';
  const filterRaw = searchParams.get('filterGachaIds') ?? '';
  const filterIds = filterRaw ? filterRaw.split(',').filter(Boolean) : [];
  const search    = searchParams.get('contentSearch') ?? '';   // マップの検索を引き継ぐ
  const MOBILE_BREAKPOINT = 768;
  const isMobile  = useIsMobile(MOBILE_BREAKPOINT);
  return isMobile
    ? <MobilePostPage  initialMode={mode} initialSpotId={spotId} initialSpotName={spotName} initialFilterGachaIds={filterIds} initialSearch={search} />
    : <DesktopPostPage initialMode={mode} initialSpotId={spotId} initialSpotName={spotName} initialFilterGachaIds={filterIds} initialSearch={search} />;
}

// ─── エントリポイント ─────────────────────────────────────────────────────

export default function PostPage() {
  return (
    <Suspense>
      <PostPageContent />
    </Suspense>
  );
}
