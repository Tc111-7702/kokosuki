import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import * as db from '@/lib/db';
import { notifyFavoriteStock } from '@/lib/notifications';

// 在庫報告を許可する店舗からの最大距離（メートル）。クライアント側(SpotDetailSheet / StockSpotPanel)は
// 500m で制限しているが、直接 API を叩かれても弾けるようサーバーでも検証する。
// クライアントとサーバーで現在地取得のタイミングがずれるため、GPS 誤差ぶんの猶予を持たせる。
const STOCK_REPORT_MAX_DISTANCE_M = 700;

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// POST /api/stock-posts  — 在庫情報投稿を作成 & Machine.stockStatus を更新
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { gachaId, spotId, stockStatus, lat, lng } = body as {
    gachaId: string;
    spotId: string;
    stockStatus: string;
    lat?: number;
    lng?: number;
  };

  if (!gachaId || !spotId || !stockStatus) {
    return NextResponse.json({ error: 'gachaId, spotId, stockStatus は必須です' }, { status: 400 });
  }

  // 距離検証: 現在地(lat/lng)が必須。店舗座標との距離が上限を超えたら拒否。
  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: '現在地が確認できないため在庫報告できません' }, { status: 403 });
  }
  const spot = await db.getSpotById(spotId);
  if (!spot) {
    return NextResponse.json({ error: '店舗が見つかりません' }, { status: 404 });
  }
  const distance = haversineM(lat, lng, spot.lat, spot.lng);
  if (distance > STOCK_REPORT_MAX_DISTANCE_M) {
    return NextResponse.json({ error: '店舗から離れているため在庫報告できません' }, { status: 403 });
  }

  // Machine を取得または作成し、stockStatus を最新値に更新
  const machine = await db.upsertMachineWithStock(spotId, gachaId, stockStatus);

  const stockPost = await db.createStockPost({
    userId:      session.user.id,
    machineId:   machine.id,
    spotId,
    gachaId,
    stockStatus,
  });

  // このガチャをお気に入り登録しているユーザーへ通知（失敗しても投稿は成功扱い）
  await notifyFavoriteStock(stockPost);

  return NextResponse.json({ stockPost }, { status: 201 });
}
