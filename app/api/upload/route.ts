import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSupabaseAdmin, UPLOAD_BUCKET } from '@/lib/supabase';
import { stripJpegMetadata } from '@/lib/imageMeta';

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'ファイルがありません' }, { status: 400 });

    // 画像のみ許可
    if (file.type && !file.type.startsWith('image/')) {
      return NextResponse.json({ error: '画像ファイルを選んでください' }, { status: 400 });
    }

    // JPEG の EXIF/GPS 等のメタデータを除去する（撮影位置など機密情報の流出防止・ロスレス）。
    // ネイティブ依存(sharp)は Vercel/Turbopack でのデプロイが不安定なため使わない。JPEG以外はそのまま。
    const buffer = stripJpegMetadata(Buffer.from(await file.arrayBuffer()));
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const contentType = file.type || 'image/jpeg';

    const path = `${randomUUID()}.${ext}`;

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage
      .from(UPLOAD_BUCKET)
      .upload(path, buffer, {
        contentType,
        upsert: false,
      });
    if (error) {
      console.error('[upload] supabase', error);
      return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 });
    }

    const { data } = supabase.storage.from(UPLOAD_BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (e) {
    console.error('[upload]', e);
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 });
  }
}
