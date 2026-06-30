import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const raw = await db.getGachaById(id);
    if (!raw) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const gacha = {
      ...r