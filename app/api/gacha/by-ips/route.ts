import { NextRequest, NextResponse } from 'next/server';
import { getGachasByIpNamesForSignup } from '@/lib/db';

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('ipNames') ?? '';
  const ipNames = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (ipNames.length === 0) return NextResponse.json({ gachas: [] });
  const gachas = await getGachasByIpNamesForSignup(ipNames);
  return NextResponse.json({ gachas });
}
