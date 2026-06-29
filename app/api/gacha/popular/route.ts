import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const limit = Math.min(Number(new URL(request.url).searchParams.get('limit') ?? '20'), 50);
  const gachas = await db.getPopularGachas(limit);
  return NextResponse.json({ gachas });
}
