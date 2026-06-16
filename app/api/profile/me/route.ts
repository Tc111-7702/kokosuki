import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { headers } from 'next/headers';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user;
  const profile = await db.findProfileByUserId(user.id);

  return NextResponse.json({
    id:          user.id,
    name:        user.name,
    email:       user.email,
    handle:      profile?.handle ?? null,
    avatarUrl:   profile?.avatarUrl ?? null,
    bio:         profile?.bio ?? null,
    favoriteIps: profile?.favoriteIps ?? [],
  });
}
