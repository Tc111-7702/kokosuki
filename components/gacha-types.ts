export interface GachaDetail {
  id: string; seriesName: string; ipName: string; category: string;
  status: string; price: number; gradientFrom: string; gradientTo: string;
  lineup: string[] | null; imageUrl: string | null;
  weeklyPulls: number; postCount: number;
  isReissue: boolean;
  genre: string | null; releaseDate: string | null; maker: string | null; sourceUrl: string | null;
}

export interface NearbySpot {
  id: string; name: string; address: string; distance: number;
  phone: string | null; gachaIds: string[]; stockMap: Record<string, string>;
}
