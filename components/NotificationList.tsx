'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, Heart, MessageCircle, Package } from 'lucide-react';

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

interface Props {
  onClose: () => void;
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
  return <Bell size={18} color="#888" />;
}

export function NotificationList({ onClose }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    fetch('/api/notifications')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive) setItems(d?.notifications ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });

    // 一覧を開いた時点で全既読化（ベルのバッジを消す）
    fetch('/api/notifications/read', { method: 'PATCH' }).catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  // 通知タップ時の遷移先（在庫・口コミ系は店舗ページ、投稿への反応はみんなタブ）
  const destination = (n: NotificationItem): string | null => {
    if (n.type === 'favorite_stock' && n.spotId) return `/store/${n.spotId}`;
    if (n.spotReviewId && n.spotId) return `/store/${n.spotId}`;
    if (n.postId || n.stockPostId) return '/home?tab=community';
    if (n.spotId) return `/store/${n.spotId}`;
    return null;
  };

  const openNotification = (n: NotificationItem) => {
    const dest = destination(n);
    if (!dest) return;
    onClose();
    router.push(dest);
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-[#FFFEEF]">
      <div
        className="flex-shrink-0 bg-white flex items-center gap-2 px-3"
        style={{ height: 52, borderBottom: '1.5px solid #EDE9D8' }}
      >
        <button onClick={onClose} className="p-2 active:opacity-60" aria-label="戻る">
          <ArrowLeft size={20} color="#555" />
        </button>
        <h1 className="text-[16px] font-black" style={{ color: '#111' }}>通知</h1>
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
            const dest = destination(n);
            return (
              <button
                key={n.id}
                onClick={() => openNotification(n)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left active:opacity-70"
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
