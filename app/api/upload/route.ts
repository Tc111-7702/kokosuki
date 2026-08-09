import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabaseAdmin, UPLOAD_BUCKET } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'ファイルがありません' }, { status: 400 });

    // 画像のみ許可
    if (file.type && !file.type.startsWith('image/')) {
      return NextResponse.json({ error: '画像ファイルを選んでください' }, { status: 400 });
    }

    const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabaseAdmin.storage
      .from(UPLOAD_BUCKET)
      .upload(path, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      });
    if (error) {
      console.error('[upload] supabase', error);
      return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 });
    }

    const { data } = supabaseAdmin.storage.from(UPLOAD_BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (e) {
    console.error('[upload]', e);
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 });
  }
}
