import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ gachaId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { gachaId } = await params;

  await prisma.gachaLike.deleteMany({
    where: { userId: session.user.id, gachaId },
  });

  return NextResponse.json({ ok: true });
}
