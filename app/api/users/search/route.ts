import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';
  if (!q) return NextResponse.json({ users: [] });

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id;

    const users = await db.searchUsers(q, userId);

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        handle: u.profile?.handle ?? null,
        image: u.image ?? null,
        bio: u.profile?.bio ?? null,
      })),
    });
  } catch {
    return NextResponse.json({ users: [] });
  }
}
