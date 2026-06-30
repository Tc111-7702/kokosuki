import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gacha = await db.getGachaById(id);
  if (!gacha) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ gacha });
}
