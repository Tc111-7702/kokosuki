'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Settings, User, ArrowLeft } from 'lucide-react';
import { PostCard } from '@/components/PostCard';
import { StockPostCard } from '@/components/StockPostCard';
import { PostDetail } from '@/components/PostDetail';
import { StockPostDetail } from '@/components/StockPostDetail';
import { type FeedPost } from '@/components/community-types';
import { type StockFeedPost } from '@/components/StockPostCard';
import { useIsMobile } from '@/lib/useIsMobile';

// ─── 型 ──────────────────────────────────────────────────────────────────────

interface Summary {
  id: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  bio: string | null;
  favoriteIps: string[];
  stats: { postCount: number; kamibikiCount: number; likeCount: number };
}

interface FavoriteGacha {
  id: string;
  seriesName: string;
  imageUrl: string | null;
  gradientFrom: string;
  gradientTo: string;
}

type Tab = 'posts' | 'reports' | 'favorites';

// ─── メイン ──────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const { id: userId } = useParams<{ id: string }>();
  const isMobile = useIsMobile();

  const [isOwn, setIsOwn] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [reports, setReports] = useState<StockFeedPost[] | null>(null);
  const [favorites, setFavorites] = useState<FavoriteGacha[] | null>(null);
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [selectedStock, setSelectedStock] = useState<StockFeedPost | null>(null);

  // ログインユーザーと一致するか（一致時のみヘッダー＋設定を表示）
  useEffect(() => {
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setIsOwn(!!d?.user?.id && d.user.id === userId))
      .catch(() => {});
  }, [userId]);

  // プロフィール概要
  useEffect(() => {
    setSummary(null);
    setNotFound(false);
    fetch(`/api/users/${userId}/summary`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setSummary)
      .catch(() => setNotFound(true));
  }, [userId]);

  // userId変更時にリセット
  useEffect(() => {
    setTab('posts');
    setPosts(null);
    setReports(null);
    setFavorites(null);
    setSelectedPost(null);
    setSelectedStock(null);
  }, [userId]);

  // データ遅延ロード（デスクトップの「投稿/報告」タブは両方必要）
  const feedActive = tab === 'posts' || tab === 'reports';
  useEffect(() => {
    const needPosts = feedActive && (isMobile ? tab === 'posts' : true);
    const needReports = feedActive && (isMobile ? tab === 'reports' : true);
    if (needPosts && posts === null) {
      fetch(`/api/users/${userId}/posts`).then((r) => (r.ok ? r.json() : null)).then((d) => setPosts(d?.posts ?? [])).catch(() => setPosts([]));
    }
    if (needReports && reports === null) {
      fetch(`/api/users/${userId}/stock-posts`).then((r) => (r.ok ? r.json() : null)).then((d) => setReports(d?.stockPosts ?? [])).catch(() => setReports([]));
    }
    if (tab === 'favorites' && favorites === null) {
      fetch(`/api/users/${userId}/favorites`).then((r) => (r.ok ? r.json() : null)).then((d) => setFavorites(d?.gachas ?? [])).catch(() => setFavorites([]));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, isMobile, userId]);

  if (notFound) {
    return (
      <div className="flex items-center justify-center h-full bg-[#FFFEEF]">
        <p className="text-[14px]" style={{ color: '#AAA' }}>ユーザーが見つかりません</p>
      </div>
    );
  }

  // ── リスト描画 ──
  const PostsList = (
    posts === null ? <Loading /> : posts.length === 0 ? (
      <Empty text="まだ引いた！投稿がありません" sub={isOwn ? 'ガチャを引いたら、＋から投稿してみよう' : ''} />
    ) : (
      <div className="py-2">{posts.map((p) => <PostCard key={p.id} post={p} onSelect={setSelectedPost} />)}</div>
    )
  );
  const ReportsList = (
    reports === null ? <Loading /> : reports.length === 0 ? (
      <Empty text="まだ在庫報告がありません" sub={isOwn ? 'お店に着いたら、在庫を教えてあげよう' : ''} />
    ) : (
      <div className="py-2">{reports.map((r) => <StockPostCard key={r.id} post={r} onSelect={setSelectedStock} />)}</div>
    )
  );
  const FavoritesGrid = (
    favorites === null ? <Loading /> : favorites.length === 0 ? (
      <Empty text="まだお気に入りがありません" sub={isOwn ? '気になるガチャを見つけたら、ハートで登録しよう' : ''} />
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
  );

  // モバイル: 従来の大きめレイアウト（統計は下に3分割ブロック）
  const ProfileBlockMobile = (
    <div className="bg-white px-5 pt-5 pb-4 flex-shrink-0" style={{ borderBottom: '1.5px solid #EDE9D8' }}>
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
      {summary?.bio && <p className="mt-3 text-[13px] leading-relaxed" style={{ color: '#555' }}>{summary.bio}</p>}
      {summary && summary.favoriteIps.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {summary.favoriteIps.map((ip) => (
            <span key={ip} className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#FFF8D0', color: '#B45309' }}>{ip}</span>
          ))}
        </div>
      )}
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
  );

  // デスクトップ: 高さを詰めたコンパクトレイアウト（名前の右に一言・お気に入りIP、統計は右端）
  const ProfileBlockDesktop = (
    <div className="bg-white px-5 pt-3 pb-3 flex-shrink-0 flex items-center gap-3" style={{ borderBottom: '1.5px solid #EDE9D8' }}>
      <div className="flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ width: 48, height: 48, borderRadius: 24, background: '#F0ECD8' }}>
        {summary?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={summary.avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <User size={24} color="#B0AC98" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 min-w-0">
          <p className="text-[15px] font-black truncate flex-shrink-0" style={{ color: '#111' }}>{summary?.name ?? '…'}</p>
          {summary?.handle && <p className="text-[11px] flex-shrink-0" style={{ color: '#AAA' }}>@{summary.handle}</p>}
          {summary?.bio && <p className="text-[12px] truncate" style={{ color: '#777' }}>{summary.bio}</p>}
        </div>
        {summary && summary.favoriteIps.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {summary.favoriteIps.map((ip) => (
              <span key={ip} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FFF8D0', color: '#B45309' }}>{ip}</span>
            ))}
          </div>
        )}
      </div>
      <div className="flex-shrink-0 flex items-center gap-3">
        {[
          { label: '引いた', value: summary?.stats.postCount },
          { label: '神引き', value: summary?.stats.kamibikiCount },
          { label: 'いいね', value: summary?.stats.likeCount },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-[15px] font-black leading-none" style={{ color: '#111' }}>{s.value ?? '–'}</p>
            <p className="text-[10px] font-bold mt-0.5" style={{ color: '#AAA' }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const ProfileBlock = isMobile ? ProfileBlockMobile : ProfileBlockDesktop;

  // ── タブバー ──
  const TabButton = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
    <button onClick={onClick} className="flex-1 py-3 text-[13px] font-bold relative" style={{ color: active ? '#F2B800' : '#AAA' }}>
      {label}
      {active && <div className="absolute bottom-0 left-1/2 -translate-x-1/2" style={{ width: 20, height: 2.5, background: '#FFCD31', borderRadius: 99 }} />}
    </button>
  );

  const TabBar = (
    <div className="flex bg-white flex-shrink-0" style={{ borderBottom: '1.5px solid #EDE9D8' }}>
      {isMobile ? (
        <>
          <TabButton active={tab === 'posts'} label="投稿" onClick={() => setTab('posts')} />
          <TabButton active={tab === 'reports'} label="報告" onClick={() => setTab('reports')} />
          <TabButton active={tab === 'favorites'} label="おきにいり" onClick={() => setTab('favorites')} />
        </>
      ) : (
        <>
          <TabButton active={feedActive} label="投稿 / 報告" onClick={() => setTab('posts')} />
          <TabButton active={tab === 'favorites'} label="おきにいり" onClick={() => setTab('favorites')} />
        </>
      )}
    </div>
  );

  // 返信後、詳細表示中の値と一覧カードの両方の返信数を+1（リロードせず即時反映）
  const bumpPostReplies = () => {
    const id = selectedPost?.id;
    if (!id) return;
    setSelectedPost(prev => prev ? { ...prev, _count: { ...prev._count, replies: prev._count.replies + 1 } } : prev);
    setPosts(list => list ? list.map(p => p.id === id ? { ...p, _count: { ...p._count, replies: p._count.replies + 1 } } : p) : list);
  };
  const bumpStockReplies = () => {
    const id = selectedStock?.id;
    if (!id) return;
    setSelectedStock(prev => prev ? { ...prev, _count: { ...prev._count, replies: prev._count.replies + 1 } } : prev);
    setReports(list => list ? list.map(r => r.id === id ? { ...r, _count: { ...r._count, replies: r._count.replies + 1 } } : r) : list);
  };
  const postDetailEl  = selectedPost  ? <PostDetail      post={selectedPost}  onBack={() => setSelectedPost(null)}  onReplied={bumpPostReplies} />  : null;
  const stockDetailEl = selectedStock ? <StockPostDetail post={selectedStock} onBack={() => setSelectedStock(null)} onReplied={bumpStockReplies} /> : null;

  return (
    <div className="relative flex flex-col h-full bg-[#FFFEEF] overflow-hidden">
      {/* ヘッダー: 自分＝タイトル＋設定 / 他人＝左上の戻るボタンのみ */}
      {isOwn ? (
        <div className="flex-shrink-0 bg-white flex items-center justify-between px-4" style={{ height: 52, borderBottom: '1.5px solid #EDE9D8' }}>
          <h1 className="text-[16px] font-black" style={{ color: '#111' }}>マイページ</h1>
          <button onClick={() => router.push('/settings')} className="p-2 active:opacity-60" aria-label="設定">
            <Settings size={21} color="#555" />
          </button>
        </div>
      ) : (
        <div className="flex-shrink-0 bg-white flex items-center px-2" style={{ height: 52, borderBottom: '1.5px solid #EDE9D8' }}>
          <button onClick={() => router.back()} className="p-2 active:opacity-60" aria-label="戻る">
            <ArrowLeft size={22} color="#555" />
          </button>
        </div>
      )}

      {isMobile ? (
        // モバイル: プロフィール＋タブ＋リストを1スクロール
        <div className="flex-1 overflow-y-auto min-h-0">
          {ProfileBlock}
          <div className="sticky top-0 z-10">{TabBar}</div>
          {tab === 'posts' ? PostsList : tab === 'reports' ? ReportsList : FavoritesGrid}
        </div>
      ) : (
        // デスクトップ: プロフィール＋タブ固定、下を左右2カラム独立スクロール
        <div className="flex-1 flex flex-col min-h-0">
          {ProfileBlock}
          {TabBar}
          {tab === 'favorites' ? (
            <div className="flex-1 overflow-y-auto min-h-0">{FavoritesGrid}</div>
          ) : (
            <div className="flex-1 flex min-h-0">
              {/* 投稿カラム（返信詳細もこのカラム内で開く） */}
              <div className="flex-1 min-w-0 flex flex-col overflow-hidden" style={{ borderRight: '1.5px solid #EDE9D8' }}>
                {selectedPost ? postDetailEl : (
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <div className="sticky top-0 z-10 bg-[#FFFEEF] px-4 py-2 text-[12px] font-bold" style={{ color: '#888', borderBottom: '1px solid #EDE9D8' }}>投稿</div>
                    {PostsList}
                  </div>
                )}
              </div>
              {/* 報告カラム（返信詳細もこのカラム内で開く） */}
              <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                {selectedStock ? stockDetailEl : (
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <div className="sticky top-0 z-10 bg-[#FFFEEF] px-4 py-2 text-[12px] font-bold" style={{ color: '#888', borderBottom: '1px solid #EDE9D8' }}>報告</div>
                    {ReportsList}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* モバイル: 詳細（返信）は全画面オーバーレイで表示（デスクトップはカラム内） */}
      {isMobile && (selectedStock ? (
        <div className="absolute inset-0 z-30 bg-white">{stockDetailEl}</div>
      ) : selectedPost ? (
        <div className="absolute inset-0 z-30 bg-white">{postDetailEl}</div>
      ) : null)}
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
      {sub && <p className="text-[12px] mt-1" style={{ color: '#AAA' }}>{sub}</p>}
    </div>
  );
}
