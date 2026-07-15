'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, User, Heart, MessageCircle } from 'lucide-react';

// ─── 型 ──────────────────────────────────────────────────────────────────────

interface Summary {
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  bio: string | null;
  favoriteIps: string[];
  stats: { postCount: number; kamibikiCount: number; likeCount: number };
}

interface GachaMini {
  seriesName: string;
  imageUrl: string | null;
  gradientFrom: string;
  gradientTo: string;
}

interface MyPost {
  id: string;
  result: string;
  itemName: string | null;
  createdAt: string;
  gacha: GachaMini;
  spot: { name: string };
  _count: { likes: number; replies: number };
}

interface MyStockPost {
  id: string;
  stockStatus: string;
  createdAt: string;
  gacha: GachaMini;
  spot: { name: string };
  _count: { likes: number; replies: number };
}

interface FavoriteGacha {
  id: string;
  seriesName: string;
  imageUrl: string | null;
  gradientFrom: string;
  gradientTo: string;
}

type Tab = 'posts' | 'reports' | 'favorites';

// ─── 表示ユーティリティ ─────────────────────────────────────────────────────────

const RESULT_STYLE: Record<string, { color: string; bg: string }> = {
  '神引き': { color: '#B45309', bg: '#FEF3C7' },
  '爆死':   { color: '#DC2626', bg: '#FEE2E2' },
  'ダブり': { color: '#2563EB', bg: '#DBEAFE' },
};

const STOCK_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  in_stock:     { label: '在庫あり',   color: '#16A34A', bg: '#E8F5E9' },
  low_stock:    { label: '残りわずか', color: '#EA580C', bg: '#FFF3E9' },
  out_of_stock: { label: '売り切れ',   color: '#888888', bg: '#F0F0F0' },
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
}

function GachaThumb({ gacha, size = 48 }: { gacha: GachaMini; size?: number }) {
  return (
    <div
      className="flex-shrink-0 overflow-hidden"
      style={{ width: size, height: size, borderRadius: 10, background: `linear-gradient(135deg, ${gacha.gradientFrom}, ${gacha.gradientTo})` }}
    >
      {gacha.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={gacha.imageUrl} alt={gacha.seriesName} className="w-full h-full object-cover" />
      )}
    </div>
  );
}

// ─── メイン ──────────────────────────────────────────────────────────────────

export default function MyPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [tab, setTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<MyPost[] | null>(null);
  const [reports, setReports] = useState<MyStockPost[] | null>(null);
  const [favorites, setFavorites] = useState<FavoriteGacha[] | null>(null);

  useEffect(() => {
    fetch('/api/mypage/summary')
      .then((r) => (r.ok ? r.json() : null))
      .then(setSummary)
      .catch(() => {});
  }, []);

  // タブごとに遅延ロード
  useEffect(() => {
    if (tab === 'posts' && posts === null) {
      fetch('/api/mypage/posts').then((r) => (r.ok ? r.json() : null)).then((d) => setPosts(d?.posts ?? [])).catch(() => setPosts([]));
    }
    if (tab === 'reports' && reports === null) {
      fetch('/api/mypage/stock-posts').then((r) => (r.ok ? r.json() : null)).then((d) => setReports(d?.stockPosts ?? [])).catch(() => setReports([]));
    }
    if (tab === 'favorites' && favorites === null) {
      fetch('/api/gacha/favorites').then((r) => (r.ok ? r.json() : null)).then((d) => setFavorites(d?.gachas ?? [])).catch(() => setFavorites([]));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'posts',     label: '投稿' },
    { key: 'reports',   label: '報告' },
    { key: 'favorites', label: 'おきにいり' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#FFFEEF]">
      {/* ヘッダー */}
      <div className="flex-shrink-0 bg-white flex items-center justify-between px-4" style={{ height: 52, borderBottom: '1.5px solid #EDE9D8' }}>
        <h1 className="text-[16px] font-black" style={{ color: '#111' }}>マイページ</h1>
        <button onClick={() => router.push('/settings')} className="p-2 active:opacity-60" aria-label="設定">
          <Settings size={21} color="#555" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* プロフィール */}
        <div className="bg-white px-5 pt-5 pb-4" style={{ borderBottom: '1.5px solid #EDE9D8' }}>
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ width: 64, height: 64, borderRadius: 32, background: '#F0ECD8' }}>
              {summary?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={summary.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={30} color="#B0AC98" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[17px] font-black truncate" style={{ color: '#111' }}>{summary?.name ?? '…'}</p>
              {summary?.handle && <p className="text-[12px]" style={{ color: '#AAA' }}>@{summary.handle}</p>}
            </div>
          </div>

          {summary?.bio && (
            <p className="mt-3 text-[13px] leading-relaxed" style={{ color: '#555' }}>{summary.bio}</p>
          )}

          {summary && summary.favoriteIps.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {summary.favoriteIps.map((ip) => (
                <span key={ip} className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#FFF8D0', color: '#B45309' }}>
                  {ip}
                </span>
              ))}
            </div>
          )}

          {/* 統計 */}
          <div className="mt-4 flex rounded-2xl overflow-hidden" style={{ border: '1.5px solid #EDE9D8' }}>
            {[
              { label: '引いた！', value: summary?.stats.postCount },
              { label: '神引き',   value: summary?.stats.kamibikiCount },
              { label: 'いいね',   value: summary?.stats.likeCount },
            ].map((s, i) => (
              <div key={s.label} className="flex-1 py-3 text-center" style={{ borderLeft: i > 0 ? '1.5px solid #EDE9D8' : 'none' }}>
                <p className="text-[18px] font-black" style={{ color: '#111' }}>{s.value ?? '–'}</p>
                <p className="text-[11px] font-bold mt-0.5" style={{ color: '#AAA' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* タブ */}
        <div className="flex bg-white sticky top-0 z-10" style={{ borderBottom: '1.5px solid #EDE9D8' }}>
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)} className="flex-1 py-3 text-[13px] font-bold relative" style={{ color: tab === key ? '#F2B800' : '#AAA' }}>
              {label}
              {tab === key && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2" style={{ width: 20, height: 2.5, background: '#FFCD31', borderRadius: 99 }} />
              )}
            </button>
          ))}
        </div>

        {/* 投稿タブ */}
        {tab === 'posts' && (
          posts === null ? <Loading /> : posts.length === 0 ? (
            <Empty text="まだ引いた！投稿がありません" sub="ガチャを引いたら、＋から投稿してみよう" />
          ) : (
            posts.map((p) => {
              const rs = RESULT_STYLE[p.result] ?? { color: '#555', bg: '#F0F0F0' };
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 bg-white" style={{ borderBottom: '1px solid #F0ECD8' }}>
                  <GachaThumb gacha={p.gacha} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold truncate" style={{ color: '#111' }}>{p.gacha.seriesName}</p>
                    <p className="text-[11px] truncate mt-0.5" style={{ color: '#AAA' }}>{p.spot.name} ・ {fmtDate(p.createdAt)}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: rs.color, background: rs.bg }}>{p.result}</span>
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: '#AAA' }}><Heart size={12} />{p._count.likes}</span>
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: '#AAA' }}><MessageCircle size={12} />{p._count.replies}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )
        )}

        {/* 報告タブ */}
        {tab === 'reports' && (
          reports === null ? <Loading /> : reports.length === 0 ? (
            <Empty text="まだ在庫報告がありません" sub="お店に着いたら、在庫を教えてあげよう" />
          ) : (
            reports.map((r) => {
              const ss = STOCK_STYLE[r.stockStatus] ?? { label: r.stockStatus, color: '#555', bg: '#F0F0F0' };
              return (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3 bg-white" style={{ borderBottom: '1px solid #F0ECD8' }}>
                  <GachaThumb gacha={r.gacha} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold truncate" style={{ color: '#111' }}>{r.gacha.seriesName}</p>
                    <p className="text-[11px] truncate mt-0.5" style={{ color: '#AAA' }}>{r.spot.name} ・ {fmtDate(r.createdAt)}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: ss.color, background: ss.bg }}>{ss.label}</span>
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: '#AAA' }}><Heart size={12} />{r._count.likes}</span>
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: '#AAA' }}><MessageCircle size={12} />{r._count.replies}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )
        )}

        {/* おきにいりタブ */}
        {tab === 'favorites' && (
          favorites === null ? <Loading /> : favorites.length === 0 ? (
            <Empty text="まだお気に入りがありません" sub="気になるガチャを見つけたら、ハートで登録しよう" />
          ) : (
            <div className="grid grid-cols-3 gap-2 p-3">
              {favorites.map((gacha) => (
                <button key={gacha.id} onClick={() => router.push(`/gacha/${gacha.id}`)} className="text-left active:opacity-70">
                  <div className="w-full overflow-hidden" style={{ aspectRatio: '1', borderRadius: 12, background: `linear-gradient(135deg, ${gacha.gradientFrom}, ${gacha.gradientTo})` }}>
                    {gacha.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={gacha.imageUrl} alt={gacha.seriesName} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <p className="text-[11px] font-bold mt-1 leading-tight" style={{ color: '#333', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {gacha.seriesName}
                  </p>
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function Loading() {
  return <p className="py-14 text-center text-[13px]" style={{ color: '#AAA' }}>読み込み中…</p>;
}

function Empty({ text, sub }: { text: string; sub: string }) {
  return (
    <div className="py-16 px-6 text-center">
      <p className="text-[14px] font-bold" style={{ color: '#888' }}>{text}</p>
      <p className="text-[12px] mt-1" style={{ color: '#AAA' }}>{sub}</p>
    </div>
  );
}
