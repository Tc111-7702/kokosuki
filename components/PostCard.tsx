'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { MapPin, Heart, MessageCircle } from 'lucide-react';
import { Avatar, timeAgo } from '@/components/ui/Avatar';
import { type FeedPost } from '@/components/community-types';

export const RESULT_BADGE: Record<string, { label: string; cls: string }> = {
  '神引き': { label: '神引き', cls: 'border border-yellow-400 text-yellow-600 bg-yellow-50' },
  '爆死':       { label: '爆死',       cls: 'border border-red-300   text-red-500   bg-red-50'    },
  'ダブり': { label: 'ダブり', cls: 'border border-gray-300  text-gray-500  bg-gray-50'   },
};

export function renderWithMentions(text: string) {
  return text.split(/(@\S+)/g).map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="text-blue-500 font-medium">{part}</span>
      : <span key={i}>{part}</span>
  );
}

export function PostCard({
  post,
  onSelect,
  interactive = true,
}: {
  post: FeedPost;
  onSelect?: (post: FeedPost) => void;
  interactive?: boolean;
}) {
  const router = useRouter();
  const badge    = RESULT_BADGE[post.result];
  const gradient = 'linear-gradient(135deg, ' + post.gacha.gradientFrom + ', ' + post.gacha.gradientTo + ')';

  const [liked,     setLiked]     = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post._count.likes);
  const [pending,   setPending]   = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pending) return;
    setLiked((p) => !p);
    setLikeCount((p) => liked ? p - 1 : p + 1);
    setPending(true);
    try {
      const res = await fetch('/api/posts/' + post.id + '/like', { method: 'POST' });
      if (res.ok) {
        const data: { liked: boolean; likeCount: number } = await res.json();
        setLiked(data.liked);
        setLikeCount(data.likeCount);
      } else {
        setLiked((p) => !p);
        setLikeCount((p) => liked ? p + 1 : p - 1);
      }
    } catch {
      setLiked((p) => !p);
      setLikeCount((p) => liked ? p + 1 : p - 1);
    } finally {
      setPending(false);
    }
  };

  return (
    <article
      className={'mx-3 my-2.5 px-4 py-4 bg-white rounded-2xl shadow-sm transition-shadow ' + (interactive ? 'hover:shadow-md cursor-pointer' : '')}
      onClick={() => interactive && onSelect?.(post)}
    >
      <div className="flex items-center gap-3 mb-3">
        <Avatar user={post.user} size={40} />
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-sm text-gray-900 truncate">{post.user.name}</span>
          <span className="text-xs text-gray-400 ml-2">{timeAgo(post.createdAt)}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={e => { e.stopPropagation(); router.push('/search/genre?ipName=' + encodeURIComponent(post.gacha.ipName) + '&label=' + encodeURIComponent(post.gacha.ipName)); }}
            className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium hover:bg-yellow-200 transition-colors"
          >
            {post.gacha.ipName}
          </button>
          {badge && (
            <span className={'text-xs px-2 py-1 rounded-full font-semibold ' + badge.cls}>
              {badge.label}
            </span>
          )}
        </div>
      </div>

      <div className="relative w-full aspect-[4/3] sm:aspect-[2/1] rounded-2xl overflow-hidden mb-3" style={{ background: gradient }}>
        {post.imageUrl && (
          <Image
            src={post.imageUrl}
            alt={post.gacha.seriesName}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 560px"
          />
        )}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/40 to-transparent">
          <span className="text-white text-sm font-semibold drop-shadow">
            {post.gacha.seriesName}
          </span>
        </div>
      </div>

      <div className="mb-1">
        <button
          onClick={e => { e.stopPropagation(); router.push('/gacha/' + post.gacha.id); }}
          className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors text-left"
        >
          {post.gacha.seriesName}
        </button>
        {post.itemName && (
          <span className="ml-1.5 text-xs text-gray-500">{post.itemName}</span>
        )}
      </div>

      {post.memo && <p className="text-sm text-gray-700 mb-2 leading-relaxed">{post.memo}</p>}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-2 gap-1.5">
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <MapPin size={14} />
          <button
            onClick={e => { e.stopPropagation(); router.push('/map?spotId=' + post.spot.id); }}
            className="hover:text-yellow-600 hover:underline transition-colors text-left"
          >
            {post.spot.name}
          </button>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <MessageCircle size={20} />
            <span className="font-medium">{post._count.replies}</span>
          </div>
          <button
            onClick={handleLike}
            disabled={pending}
            className={'flex items-center gap-1.5 text-sm px-2 py-1 -mr-2 rounded-full transition-colors ' + (liked ? 'text-red-500 hover:text-red-400' : 'text-gray-400 hover:text-red-400')}
          >
            <Heart size={24} fill={liked ? 'currentColor' : 'none'} />
            <span className="font-medium">{likeCount}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
