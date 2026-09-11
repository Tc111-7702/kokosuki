import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import * as db from '@/lib/db';
import { validateInquiryBody } from '@/lib/inquiryStatus';

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const text = typeof body?.body === 'string' ? body.body : '';

    if (!validateInquiryBody(text)) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const inquiry = await db.createInquiry({
      userId: session.user.id,
      body: text,
    });

    return NextResponse.json({ inquiry: { id: inquiry.id } }, { status: 201 });
  } catch (e) {
    console.error('[inquiries POST]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
