import { NextResponse } from 'next/server';
import { fetchPhoneNumbers } from '@/lib/scrapers/phone-fetch';

export const maxDuration = 60;

export async function POST() {
  try {
    const result = await fetchPhoneNumbers();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
