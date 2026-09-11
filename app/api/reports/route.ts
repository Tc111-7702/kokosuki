import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import * as db from '@/lib/db';
import { isReportTargetType, validateReportReasonKeys } from '@/lib/reportReasons';
import { resolveReportedUserId } from '@/lib/reportTarget';

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const targetType = typeof body?.targetType === 'string' ? body.targetType : '';
    const targetId = typeof body?.targetId === 'string' ? body.targetId.trim() : '';
    const reasonKeys = Array.isArray(body?.reasonKeys)
      ? body.reasonKeys.filter((k: unknown): k is string => typeof k === 'string')
      : [];
    const detail = typeof body?.detail === 'string' ? body.detail : undefined;

    if (!isReportTargetType(targetType) || !targetId) {
      return NextResponse.json({ error: 'Invalid target' }, { status: 400 });
    }
    if (!validateReportReasonKeys(targetType, reasonKeys)) {
      return NextResponse.json({ error: 'Invalid reasonKeys' }, { status: 400 });
    }

    const reportedUserId = await resolveReportedUserId(targetType, targetId);
    if (!reportedUserId) {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 });
    }
    if (reportedUserId === session.user.id) {
      return NextResponse.json({ error: 'Cannot report yourself' }, { status: 400 });
    }

    const report = await db.createReport({
      reporterId: session.user.id,
      targetType,
      targetId,
      reportedUserId,
      reasonKeys,
      detail,
    });

    return NextResponse.json({ report: { id: report.id } }, { status: 201 });
  } catch (e) {
    console.error('[reports POST]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
