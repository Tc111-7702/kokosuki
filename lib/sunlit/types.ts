// ─── Core entities ───────────────────────────────────────────────────────────

export type UserId = string;
export type SpotId = string;
export type MachineId = string;
export type SeriesId = string;

export interface User {
  id: UserId;
  name: string;
  avatarUrl: string;
  favoriteIps: string[];
  bio?: string;
}

export type StockStatus = 'in_stock' | 'out_of_stock' | 'not_available';
export type StockQuantity = 'low' | 'normal' | 'plenty';

export type PinState =
  | 'favorite_in_stock'   // お気に入りIP・在庫あり → 強調色
  | 'favorite_no_stock'   // お気に入りIP・在庫なし → グレーアウト
  | 'in_stock'            // 在庫あり
  | 'no_stock'            // 在庫なし
  | 'unknown';            // 未報告

export interface Spot {
  id: SpotId;
  name: string;
  address: string;
  lat: number;
  lng: number;
  machineCount: number;
  pinState: PinState;
}

export interface Machine {
  id: MachineId;
  spotId: SpotId;
  seriesName: string;
  ipName: string;
  maker: string;
  price: number;
  imageUrl: string;
  stockStatus: StockStatus;
  stockQuantity?: StockQuantity;
  lastReportedAt?: string;
  reportCount?: number; // 直近この状態を裏付けた報告人数（合意ベース表示用）
}

export interface StockReport {
  id: string;
  machineId: MachineId;
  spotId: SpotId;
  userId: UserId;
  status: StockStatus;
  quantity?: StockQuantity;
  imageUrl?: string;
  createdAt: string;
}

export type PullResult = 'hit' | 'miss' | 'duplicate';

export interface Pull {
  id: string;
  machineId: MachineId;
  spotId: SpotId;
  userId: UserId;
  result: PullResult;
  itemName?: string;
  imageUrl?: string;
  memo?: string;
  isPublic: boolean;
  createdAt: string;
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

export type FeedItemType = 'pull' | 'report';

export interface FeedItem {
  id: string;
  type: FeedItemType;
  userId: UserId;
  userName: string;
  userAvatar: string;
  machine: Machine;
  spot: Spot;
  pull?: Pull;
  report?: StockReport;
  likeCount: number;
  liked: boolean;
  createdAt: string;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export type Screen =
  | 'home'
  | 'map'
  | 'mypage'
  | 'spot_detail'
  | 'feed_detail'
  | 'gacha_detail'
  | 'report_flow'
  | 'pull_flow'
  | 'result_modal'
  | 'user_profile';

export type BottomTab = 'home' | 'map' | 'mypage';

// ─── Filters ──────────────────────────────────────────────────────────────────

export type FeedFilter = 'all' | 'following_ip' | 'nearby';

export interface ResultModalData {
  result: PullResult;
  itemName?: string;
  seriesName: string;
  ipName: string;
  imageUrl: string;
}
