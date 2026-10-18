import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as db from '@/lib/db';

// GET: 今週発売の情報（今週発売枠か・楽しみの声を投稿したユーザー数）。
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const info = await db.getWeeklyInfo(id);
    return NextResponse.json(info);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
