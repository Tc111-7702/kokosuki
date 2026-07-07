import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';
  if (!q) return NextResponse.json({ users: [] });

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id;

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { profile: { handle: { contains: q, mode: 'insensitive' } } },
        ],
        ...(userId ? { NOT: { id: userId } } : {}),
      },
      select: {
        id: true,
        name: true,
        image: true,
        profile: { select: { handle: true, bio: true, avatarUrl: true } },
      },
      take: 10,
    });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        handle: u.profile?.handle ?? null,
        image: u.profile?.avatarUrl ?? u.image ?? null,
        bio: u.profile?.bio ?? null,
      })),
    });
  } catch {
    return NextResponse.json({ users: [] });
  }
}
