import { NextResponse } from 'next/server';
import { syncShopGachas } from '@/lib/scrapers/gacha-island-shop-sync';

export async function GET() {
  const result = await syncShopGachas();
  return NextResponse.json({ ok: true, ...result });
}
