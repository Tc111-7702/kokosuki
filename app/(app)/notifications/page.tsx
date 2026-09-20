'use client';
import { useSetNavActive } from '@/lib/navActiveStore';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bell, Heart, MessageCircle, Package, AtSign } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { NOTIFICATION_POLL_SECONDS, reloadUnreadNotificationCount } from '@/lib/useUnreadNotificationCount';
import { useIsMobile } from '@/lib/useIsMobile';
import { usePolling } from '@/lib/usePolling';

/** notif-shine の animation 時間に合わせる */
const NOTIF_SHINE_MS = 1200;
const POLL_MS = NOTIFICATION_POLL_SECONDS * 1000;

interface NotifActor { id: string; name: string; image: string | null }

interface NotificationItem {
  id: string;
  type: string; // favorite_stock / like / reply / mention
  title: string;
  body: string;
  gachaId: string | null;
  spotId: string | null;
  postId: string | null;
  stockPostId: string | null;
  spotReviewId: string | null;
  read: boolean;
  createdAt: string;
  actors: NotifActor[];
  actorCount: number;
  thumbnailUrl: string | null;
}

// いいねアバターを下に並べる際の表示上限（超過分は +N 表示）
const LIKE_AVATAR_SHOWN = 5;

/** あなたへ1行分の寸法（いいね行なし・サムネあり） */
const NOTIF_AVATAR_SIZE = 36;
const NOTIF_THUMB_SIZE = 52;
const ANNOUNCEMENT_THUMB_H = 40;
const ANNOUNCEMENT_THUMB_W = 60; // 3:2
const MOBILE_BREAKPOINT = 768;
const NOTIF_ROW_PT = 12;
const PERSONAL_NOTIF_ROW_PB_MOBILE = 8;
const PERSONAL_NOTIF_ROW_PB_DESKTOP = 4;

const everyoneNotifRowStyle = {
  borderBottom: '1px solid #F0ECD8',
  boxSizing: 'border-box' as const,
  paddingTop: NOTIF_ROW_PT,
  paddingBottom: 8,
};

function personalNotifRowStyle(isMobile: boolean) {
  const paddingBottom = isMobile ? PERSONAL_NOTIF_ROW_PB_MOBILE : PERSONAL_NOTIF_ROW_PB_DESKTOP;
  const base = {
    borderBottom: '1px solid #F0ECD8',
    boxSizing: 'border-box' as const,
    paddingTop: NOTIF_ROW_PT,
    paddingBottom,
  };
  // デスクトップは固定高さをやめ、日付直下までコンテンツに合わせる
  if (!isMobile) {
    return base;
  }
  return {
    ...base,
    height: NOTIF_THUMB_SIZE + NOTIF_ROW_PT + paddingBottom + 28,
    overflow: 'hidden' as const,
  };
}

interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  imageUrl: string;
  publishedAt: string | null;
  read: boolean;
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

// タイトル行に文字と同じ大きさで並べるアイコン
function typeIcon(type: string) {
  if (type === 'favorite_stock') return <Package size={14} color="#F2B800" />;
  if (type === 'like') return <Heart size={14} color="#E5484D" fill="#E5484D" />;
  if (type === 'reply') return <MessageCircle size={14} color="#0891b2" />;
  if (type === 'mention') return <AtSign size={14} color="#7C3AED" />;
  return <Bell size={14} color="#888" />;
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

// 集約されたいいねの本文（他N名）。それ以外は保存済み本文をそのまま使う。
function bodyText(n: NotificationItem): string {
  if (n.type === 'like' && n.actorCount > 1) {
    const first = n.actors[0]?.name ?? 'だれか';
    const label = n.postId ? '投稿' : n.stockPostId ? '在庫報告' : n.spotReviewId ? '口コミ' : '投稿';
    return `${first}さん他${n.actorCount - 1}人があなたの${label}にいいねしました`;
  }
  return n.body;
}

type NotifTab = 'everyone' | 'personal';

function tabFromParam(param: string | null): NotifTab {
  return param === 'everyone' ? 'everyone' : 'personal';
}

function TabUnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="inline-flex items-center justify-center flex-shrink-0"
      style={{
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        background: '#E5484D',
        color: 'white',
        fontSize: 10,
        fontWeight: 700,
        padding: '0 5px',
        lineHeight: 1,
      }}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

function TabButton({
  active,
  label,
  unreadCount,
  onClick,
}: {
  active: boolean;
  label: string;
  unreadCount: number;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex-1 py-2 md:py-3 text-[13px] font-bold relative z-[1]" style={{ color: active ? '#F2B800' : '#AAA' }}>
      <span className="inline-flex items-center justify-center gap-1.5">
        {label}
        {!active && <TabUnreadBadge count={unreadCount} />}
      </span>
    </button>
  );
}

const ANNOUNCEMENT_BODY_PREVIEW_DESKTOP = 28;

function announcementBodyPreview(body: string, isMobile: boolean): string {
  if (isMobile) return body;
  const text = body.trim();
  if (text.length <= ANNOUNCEMENT_BODY_PREVIEW_DESKTOP) return text;
  return `${text.slice(0, ANNOUNCEMENT_BODY_PREVIEW_DESKTOP)}…`;
}

function EveryoneTab({ onMarkedRead }: { onMarkedRead?: () => void }) {
  const router = useRouter();
  const isMobile = useIsMobile(MOBILE_BREAKPOINT);
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    let markReadTimer: ReturnType<typeof setTimeout> | null = null;

    const clearMarkReadTimer = () => {
      if (markReadTimer !== null) {
        clearTimeout(markReadTimer);
        markReadTimer = null;
      }
    };

    const scheduleMarkRead = () => {
      clearMarkReadTimer();
      markReadTimer = setTimeout(() => {
        markReadTimer = null;
        if (!alive) return;
        setItems((prev) => prev.map((a) => (a.read ? a : { ...a, read: true })));
        // PATCH 完了前にベル再取得すると未読のまま返るため、完了後に onMarkedRead
        fetch('/api/announcements/read', { method: 'PATCH' })
          .catch(() => {})
          .finally(() => {
            if (!alive) return;
            onMarkedRead?.();
          });
      }, NOTIF_SHINE_MS);
    };

    const load = () =>
      fetch('/api/announcements')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!alive) return;
          const announcements: AnnouncementItem[] = d?.announcements ?? [];
          setItems(announcements);
          if (announcements.some((a) => !a.read)) {
            scheduleMarkRead();
          }
        })
        .catch(() => {})
        .finally(() => {
          if (alive) setLoading(false);
        });

    load();

    // 閲覧中は一定間隔で再取得し、追加・削除を反映（非表示タブでは休む）
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, POLL_MS);

    return () => {
      alive = false;
      clearInterval(timer);
      clearMarkReadTimer();
    };
  }, [onMarkedRead]);

  if (loading) {
    return <p className="py-16 text-center text-[13px]" style={{ color: '#AAA' }}>読み込み中...</p>;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 px-6 text-center">
        <p className="text-[14px] font-bold" style={{ color: '#888' }}>お知らせはありません</p>
        <p className="mt-1 text-[12px] leading-relaxed" style={{ color: '#AAA' }}>
          運営からのお知らせがここに表示されます
        </p>
      </div>
    );
  }

  return (
    <>
      {items.map((a) => {
        const hasImage = Boolean(a.imageUrl?.trim());
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => router.push(`/notifications/announcements/${a.id}`)}
            className={"w-full flex items-start gap-3 pl-3 pr-4 text-left active:opacity-70" + (a.read ? "" : " notif-shine")}
            style={{
              ...everyoneNotifRowStyle,
              background: a.read ? 'transparent' : '#FFF8D0',
            }}
          >
            <div className="flex-1 min-w-0 min-h-0">
              <p className="text-[13px] font-bold truncate" style={{ color: '#111' }}>
                {a.title}
              </p>
              <p className={`text-[12px] mt-0.5 ${isMobile ? 'truncate' : ''}`} style={{ color: '#666' }}>
                {announcementBodyPreview(a.body, isMobile)}
              </p>
              {a.publishedAt && (
                <p className="text-[11px] mt-1 truncate" style={{ color: '#AAA' }}>
                  {timeAgo(a.publishedAt)}
                </p>
              )}
            </div>

            {hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={a.imageUrl}
                alt=""
                className="flex-shrink-0 object-cover"
                style={{
                  width: ANNOUNCEMENT_THUMB_W,
                  height: ANNOUNCEMENT_THUMB_H,
                  aspectRatio: '3 / 2',
                  borderRadius: 0,
                  background: '#F0ECD8',
                }}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex-shrink-0" style={{ width: ANNOUNCEMENT_THUMB_W, height: ANNOUNCEMENT_THUMB_H }} aria-hidden />
            )}
          </button>
        );
      })}
    </>
  );
}

function PersonalNotificationsTab({ onMarkedRead }: { onMarkedRead?: () => void }) {
  const router = useRouter();
  const isMobile = useIsMobile(MOBILE_BREAKPOINT);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    let markReadTimer: ReturnType<typeof setTimeout> | null = null;

    const clearMarkReadTimer = () => {
      if (markReadTimer !== null) {
        clearTimeout(markReadTimer);
        markReadTimer = null;
      }
    };

    // GET で未読を描画してから演出時間後に既読化（サーバー＋ローカル）。
    // GET と PATCH を同時に投げると PATCH が先に走り演出が出ないため遅延する。
    const scheduleMarkRead = () => {
      clearMarkReadTimer();
      markReadTimer = setTimeout(() => {
        markReadTimer = null;
        if (!alive) return;
        setItems((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })));
        fetch('/api/notifications/read', { method: 'PATCH' })
          .catch(() => {})
          .finally(() => {
            if (!alive) return;
            onMarkedRead?.();
          });
      }, NOTIF_SHINE_MS);
    };

    const load = () =>
      fetch('/api/notifications')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!alive) return;
          // items を丸ごと差し替え。key(id) は不変なので、いいね者が更新された
          // 通知は actor[0]（左アバター）と下のいいね者一覧だけが差し替わる。
          const notifications: NotificationItem[] = d?.notifications ?? [];
          setItems(notifications);
          if (notifications.some((n) => !n.read)) {
            scheduleMarkRead();
          }
        })
        .catch(() => {})
        .finally(() => {
          if (alive) setLoading(false);
        });

    load();

    // 閲覧中は一定間隔で再取得し、いいね者の更新を反映（非表示タブでは休む）
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, POLL_MS);

    return () => {
      alive = false;
      clearInterval(timer);
      clearMarkReadTimer();
    };
  }, [onMarkedRead]);

  if (loading) {
    return <p className="py-16 text-center text-[13px]" style={{ color: '#AAA' }}>読み込み中...</p>;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 px-6 text-center">
        <p className="text-[14px] font-bold" style={{ color: '#888' }}>まだ通知はありません</p>
        <p className="mt-1 text-[12px] leading-relaxed" style={{ color: '#AAA' }}>
          お気に入りのガチャに在庫情報が届いたり、<br />あなたの投稿に反応があるとここに表示されます
        </p>
      </div>
    );
  }

  return (
    <>
      {items.map((n) => {
        const dest = destinationUrl(n);
        const actor = n.actors[0] ?? null;
        const showLikeRow = n.type === 'like' && n.actors.length > 0;
        return (
          <button
            key={n.id}
            onClick={() => { if (dest) router.push(dest); }}
            className={"w-full flex items-start gap-3 px-4 text-left active:opacity-70" + (n.read ? "" : " notif-shine")}
            style={{
              ...personalNotifRowStyle(isMobile),
              background: n.read ? 'transparent' : '#FFF8D0',
              cursor: dest ? 'pointer' : 'default',
              ...(showLikeRow ? { height: 'auto', overflow: 'visible' } : {}),
            }}
          >
            {/* 左: 相手ユーザーのアイコン（アクター不明時は種別アイコンにフォールバック） */}
            <div className="flex-shrink-0">
              {actor ? (
                <Avatar user={actor} size={NOTIF_AVATAR_SIZE} />
              ) : (
                <div
                  className="flex items-center justify-center"
                  style={{ width: NOTIF_AVATAR_SIZE, height: NOTIF_AVATAR_SIZE, borderRadius: 18, background: 'white', border: '1.5px solid #EDE9D8' }}
                >
                  {typeIcon(n.type)}
                </div>
              )}
            </div>

            {/* 中央: タイトル(アイコン+文字)・本文・(いいね時)アバター列・日時 */}
            <div className="flex-1 min-w-0">
              <p className="flex items-center gap-1 text-[13px] font-bold" style={{ color: '#111' }}>
                <span className="inline-flex flex-shrink-0">{typeIcon(n.type)}</span>
                <span className="truncate">{n.title}</span>
              </p>
              <p
                className="text-[12px] mt-0.5 leading-relaxed"
                style={{ color: '#666', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
              >
                {bodyText(n)}
              </p>

              {showLikeRow && (
                <div className="flex items-center mt-1.5">
                  {n.actors.slice(0, LIKE_AVATAR_SHOWN).map((a, i) => (
                    <span
                      key={a.id}
                      className="inline-flex rounded-full"
                      style={{ marginLeft: i === 0 ? 0 : -6, border: '2px solid #FFFFFF', borderRadius: 999 }}
                    >
                      <Avatar user={a} size={22} />
                    </span>
                  ))}
                  {n.actorCount > LIKE_AVATAR_SHOWN && (
                    <span className="ml-1.5 text-[11px] font-bold" style={{ color: '#888' }}>
                      +{n.actorCount - LIKE_AVATAR_SHOWN}
                    </span>
                  )}
                </div>
              )}

              <p className="text-[11px] mt-1" style={{ color: '#AAA' }}>{timeAgo(n.createdAt)}</p>
            </div>

            {/* 右: 投稿写真 / ガチャ画像のサムネ */}
            {n.thumbnailUrl && (
              // 任意ホストの画像に対応するため next/image ではなく img を使用
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={n.thumbnailUrl}
                alt=""
                className="flex-shrink-0 object-cover"
                style={{ width: NOTIF_THUMB_SIZE, height: NOTIF_THUMB_SIZE, borderRadius: 10, background: '#F0ECD8' }}
                referrerPolicy="no-referrer"
              />
            )}
          </button>
        );
      })}
    </>
  );
}

function NotificationsPageInner() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<NotifTab>(() => tabFromParam(searchParams.get('tab')));
  const [tabUnread, setTabUnread] = useState({ everyone: 0, personal: 0 });

  useEffect(() => {
    setTab(tabFromParam(searchParams.get('tab')));
  }, [searchParams]);

  const loadTabUnread = useCallback(() => {
    const tabFetch = fetch('/api/notifications/tab-unread-counts')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setTabUnread({
            everyone: d.everyone ?? 0,
            personal: d.personal ?? 0,
          });
        }
      });
    return Promise.all([tabFetch, reloadUnreadNotificationCount()]).catch(() => {});
  }, []);

  useEffect(() => { loadTabUnread(); }, [loadTabUnread]);

  const pollTasks = useMemo(() => [loadTabUnread], [loadTabUnread]);
  usePolling(pollTasks, NOTIFICATION_POLL_SECONDS);

  const markEveryoneRead = useCallback(() => {
    setTabUnread((prev) => ({ ...prev, everyone: 0 }));
    reloadUnreadNotificationCount().catch(() => {});
  }, []);

  const markPersonalRead = useCallback(() => {
    setTabUnread((prev) => ({ ...prev, personal: 0 }));
    reloadUnreadNotificationCount().catch(() => {});
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#FFFFFF]">
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

      <div className="relative flex bg-white flex-shrink-0" style={{ borderBottom: '1.5px solid #EDE9D8' }}>
        <div
          className="absolute bottom-0 left-0 pointer-events-none transition-transform duration-200 ease-out"
          style={{
            width: '50%',
            height: 2.5,
            background: '#FFCD31',
            boxShadow: '0 0 10px rgba(255, 205, 49, 0.55)',
            transform: `translateX(${tab === 'everyone' ? 0 : 100}%)`,
          }}
          aria-hidden
        />
        <TabButton
          active={tab === 'everyone'}
          label="みなさまへ"
          unreadCount={tabUnread.everyone}
          onClick={() => { setTab('everyone'); loadTabUnread(); }}
        />
        <TabButton
          active={tab === 'personal'}
          label="あなたへ"
          unreadCount={tabUnread.personal}
          onClick={() => { setTab('personal'); loadTabUnread(); }}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'everyone' ? (
          <EveryoneTab onMarkedRead={markEveryoneRead} />
        ) : (
          <PersonalNotificationsTab onMarkedRead={markPersonalRead} />
        )}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  useSetNavActive('notifications');
  return (
    <Suspense>
      <NotificationsPageInner />
    </Suspense>
  );
}
