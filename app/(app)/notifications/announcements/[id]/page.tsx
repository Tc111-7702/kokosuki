'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface AnnouncementDetail {
  id: string;
  title: string;
  body: string;
  imageUrl: string;
  publishedAt: string | null;
}

function hasImageUrl(url: string): boolean {
  return url.trim().length > 0;
}

const ANNOUNCEMENT_DETAIL_IMAGE_W = 520;

function AnnouncementImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative w-full overflow-hidden aspect-[3/2]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

function AnnouncementArticle({ item }: { item: AnnouncementDetail }) {
  const showImage = hasImageUrl(item.imageUrl);

  return (
    <article className="flex flex-col gap-4 md:gap-5 max-w-[960px] w-full mx-auto">
      <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-5">
        <div className="flex flex-col gap-4 md:gap-5 flex-1 min-w-0">
          <h2 className="text-[20px] font-black leading-snug" style={{ color: '#111' }}>
            {item.title}
          </h2>
          <p
            className="text-[14px] leading-relaxed whitespace-pre-wrap break-words"
            style={{ color: '#333' }}
          >
            {item.body}
          </p>
        </div>

        {showImage && (
          <>
            <div className="w-full md:hidden">
              <AnnouncementImage src={item.imageUrl} alt={item.title} />
            </div>
            <div
              className="hidden md:block flex-shrink-0"
              style={{ width: ANNOUNCEMENT_DETAIL_IMAGE_W }}
            >
              <AnnouncementImage src={item.imageUrl} alt={item.title} />
            </div>
          </>
        )}
      </div>
    </article>
  );
}

export default function AnnouncementDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params.id ?? '');
  const [items, setItems] = useState<AnnouncementDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const selected = useMemo(
    () => items.find((a) => a.id === id) ?? null,
    [items, id],
  );

  const rest = useMemo(
    () => items.filter((a) => a.id !== id),
    [items, id],
  );

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    setNotFound(false);
    setItems([]);

    fetch('/api/announcements')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        const announcements: AnnouncementDetail[] = d?.announcements ?? [];
        setItems(announcements);
        if (!announcements.some((a) => a.id === id)) {
          setNotFound(true);
        }
      })
      .catch(() => {
        if (alive) setNotFound(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <div className="flex flex-col h-full bg-[#F7F6F3]">
      <header className="flex items-center gap-2 px-4 md:px-10 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <button
          type="button"
          onClick={() => router.push('/notifications?tab=everyone')}
          className="flex items-center gap-1 pr-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600 active:opacity-70"
          aria-label="もどる"
        >
          <ArrowLeft size={20} />
          <span className="text-[14px] font-bold">もどる</span>
        </button>
        <h1 className="text-[16px] font-black text-gray-900">お知らせ</h1>
      </header>

      <main className="flex-1 overflow-y-auto min-h-0 px-4 md:px-10 py-4 md:py-6">
        {loading ? (
          <p className="text-center text-[13px] py-16" style={{ color: '#AAA' }}>読み込み中...</p>
        ) : notFound || !selected ? (
          <p className="text-center text-[13px] py-16" style={{ color: '#888' }}>お知らせが見つかりません</p>
        ) : (
          <div className="flex flex-col gap-8 md:gap-10">
            <AnnouncementArticle item={selected} />
            {rest.map((item) => (
              <div key={item.id}>
                <div className="max-w-[960px] mx-auto mb-6 md:mb-8" style={{ borderTop: '1px solid #EDE9D8' }} />
                <AnnouncementArticle item={item} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
