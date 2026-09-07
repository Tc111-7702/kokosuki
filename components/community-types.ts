'use client';

import { type StockFeedPost } from '@/components/StockPostCard';

export interface FeedPost {
  id: string;
  result: string;
  itemName: string | null;
  imageUrl: string | null;
  memo: string | null;
  createdAt: string;
  likedByMe: boolean;
  user: { id: string; name: string; image: string | null; profile?: { handle: string | null } | null };
  spot: { id: string; name: string };
  postType: 'post';
  gacha: { id: string; ipName: string; seriesName: string; gradientFrom: string; gradientTo: string; imageUrl: string | null; status?: string };
  _count: { likes: number; replies: number };
}

export type FeedItem = FeedPost | StockFeedPost;

export interface Reply {
  id: string;
  text: string;
  createdAt: string;
  user: { id: string; name: string; image: string | null; profile?: { handle: string | null } | null };
}

export interface UserResult {
  id: string;
  name: string;
  handle: string | null;
  image: string | null;
  bio: string | null;
}

export interface TrendingGacha {
  id: string;
  seriesName: string;
  ipName: string;
  imageUrl: string | null;
  gradientFrom: string;
  gradientTo: string;
  likeCount: number;
}

export interface TrendingIP {
  ipName: string;
  imageUrl: string | null;
  gradientFrom: string;
  gradientTo: string;
  likeCount: number;
}

export interface RecommendedUser {
  id: string;
  name: string;
  handle: string | null;
  image: string | null;
  bio: string | null;
}
