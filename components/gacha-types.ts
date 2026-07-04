export interface GachaDetail {
  id: string; seriesName: string; ipName: string; kind: string; category: string;
  status: string; price: number; gradientFrom: string; gradientTo: string;
  lineup: string[] | null; imageUrl: string | null;
  commentCount: number; weeklyPulls: number; postCount: number;
  isCollab: boolean; isReissue: boolean; isContinuation: boolean;
  genre: string | null; releaseDate: string | null; maker: string | null; sourceUrl: string | null;
}

export interface NearbySpot {
  id: string; name: string; address: string; distance: number;
  phone: string | null; gachaIds: string[]; stockMap: Record<string, string>;
}
