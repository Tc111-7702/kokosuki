'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Heart, MessageCircle, Package, AtSign } from 'lucide-react';

interface NotificationItem {
  id: string;
  type: string; // favorite_stock / like / reply
  title: string;
  body: string;
  gachaId: string | null;
  spotId: string | null;
  postId: string | null;
  stockPostId: string | null;
  spotReviewId: string | null;
  read: boolean;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'たった今';
  if (min < 60) return `${min}分前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}時間前`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}日前`;
  return new Date(iso).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
}

function typeIcon(type: string) {
  if (type === 'favorite_stock') return <Package size={18} color="#F2B800" />;
  if (type === 'like') return <Heart size={18} color="#E5484D" />;
  if (type === 'reply') return <MessageCircle size={18} color="#0891b2" />;
  if (type === 'mention') return <AtSign size={18} color="#7C3AED" />;
  return <Bell size={18} color="#888" />;
}

// 通知の遷移先URL
// ・口コミへの通知 → 店舗詳細ページでその口コミの返信欄を開く
// ・通常投稿/在庫報告への通知 → ホームの「みんな」でその投稿の返信詳細を開く
function destinationUrl(n: NotificationItem): string | null {
  if (n.spotReviewId && n.spotId) {
    return `/store/${n.spotId}?openReview=${n.spotReviewId}&noFilter=1`;
  }
  if (n.postId) {
    return `/home?tab=community&openPost=${n.postId}&type=post`;
  }
  if (n.stockPostId) {
    return `/home?tab=community&openPost=${n.stockPostId}&type=stock`;
  }
  if (n.spotId) return `/store/${n.spotId}`;
  return null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    fetch('/api/notifications')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive) setItems(d?.notifications ?? []);
        // 未読状態を取得・描画した後で既読化する。
        // （GETとPATCHを同時に投げると、PATCHが先に走ってGETが全既読で返り、
        //   未読のヒカル演出が出ないことがあるため順序を保証する）
        fetch('/api/notifications/read', { method: 'PATCH' }).catch(() => {});
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#FFFEEF]">
      {/* 未読通知に、表示時一度だけ光が走る演出 */}
      <style>{`
        .notif-shine { position: relative; overflow: hidden; animation: notifFlashBg 1.2s ease-out; }
        @keyframes notifFlashBg {
          0%   { background-color: #FFE066; }
          60%  { background-color: #FFEC99; }
          100% { background-color: #FFF8D0; }
        }
        .notif-shine::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(100deg, transparent 25%, rgba(255,255,255,0.95) 50%, transparent 75%);
          transform: translateX(-130%);
          animation: notifShine 1s ease-out;
          pointer-events: none;
        }
        @keyframes notifShine { to { transform: translateX(130%); } }
        @media (prefers-reduced-motion: reduce) {
          .notif-shine { animation: none; }
          .notif-shine::after { animation: none; }
        }
      `}</style>
      <div
        className="flex-shrink-0 bg-white flex items-center gap-2 px-3"
        style={{ height: 52, borderBottom: '1.5px solid #EDE9D8' }}
      >
        <h1 className="text-[16px] font-black" style={{ color: '#111', paddingLeft: 8 }}>通知</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="py-16 text-center text-[13px]" style={{ color: '#AAA' }}>読み込み中...</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-20 px-6 text-center">
            <Bell size={36} color="#DDD" />
            <p className="mt-4 text-[14px] font-bold" style={{ color: '#888' }}>まだ通知はありません</p>
            <p className="mt-1 text-[12px] leading-relaxed" style={{ color: '#AAA' }}>
              お気に入りのガチャに在庫情報が届いたり、<br />あなたの投稿に反応があるとここに表示されます
            </p>
          </div>
        ) : (
          items.map((n) => {
            const dest = destinationUrl(n);
            return (
              <button
                key={n.id}
                onClick={() => { if (dest) router.push(dest); }}
                className={"w-full flex items-start gap-3 px-4 py-3 text-left active:opacity-70" + (n.read ? "" : " notif-shine")}
                style={{
                  background: n.read ? 'transparent' : '#FFF8D0',
                  borderBottom: '1px solid #F0ECD8',
                  cursor: dest ? 'pointer' : 'default',
                }}
              >
                <div
                  className="flex-shrink-0 flex items-center justify-center"
                  style={{ width: 36, height: 36, borderRadius: 18, background: 'white', border: '1.5px solid #EDE9D8' }}
                >
                  {typeIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold" style={{ color: '#111' }}>{n.title}</p>
                  <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: '#666' }}>{n.body}</p>
                  <p className="text-[11px] mt-1" style={{ color: '#AAA' }}>{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && (
                  <span className="flex-shrink-0 mt-1" style={{ width: 8, height: 8, borderRadius: 4, background: '#F2B800' }} />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
