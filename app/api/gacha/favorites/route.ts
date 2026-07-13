import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await prisma.gachaLike.findMany({
    where: { userId: session.user.id },
    include: {
      gacha: {
        select: {
          id: true,
          seriesName: true,
          ipName: true,
          imageUrl: true,
          gradientFrom: true,
          gradientTo: true,
          status: true,
          releaseDate: true,
          isOnSale: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    gachas: rows.map(r => r.gacha),
  });
}
