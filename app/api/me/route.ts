import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ user: null });
    return NextResponse.json({ user: { id: session.user.id, name: session.user.name } });
  } catch {
    return NextResponse.json({ user: null });
  }
}
