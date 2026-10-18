import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as db from '@/lib/db';

// GET: 発売予定ページの右サイド用。同一IP上位5件＋今週発売上位3件（いいね順）。
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await db.getGachaRelatedLists(id);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
