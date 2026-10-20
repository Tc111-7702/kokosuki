import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { getSupabaseAdmin, UPLOAD_BUCKET } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'ファイルがありません' }, { status: 400 });

    // 画像のみ許可
    if (file.type && !file.type.startsWith('image/')) {
      return NextResponse.json({ error: '画像ファイルを選んでください' }, { status: 400 });
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());

    // EXIF/GPS 等のメタデータを除去する（撮影位置など機密情報の流出防止）。
    // sharp で再エンコードすると出力はデフォルトでメタデータを含まない。向きだけ EXIF から反映しておく。
    // SVG や sharp が扱えない形式は元データのまま保存する（フォールバック）。
    let buffer = inputBuffer;
    let ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    let contentType = file.type || 'image/jpeg';
    try {
      const fmt = (await sharp(inputBuffer, { failOn: 'none' }).metadata()).format;
      if (fmt && fmt !== 'svg') {
        buffer = await sharp(inputBuffer, { failOn: 'none', animated: fmt === 'gif' })
          .rotate() // EXIF orientation を画素に反映してからメタデータ除去出力
          .toBuffer();
        ext = fmt === 'jpeg' ? 'jpg' : fmt;
        contentType = `image/${fmt}`;
      }
    } catch (e) {
      console.error('[upload] sharp re-encode skipped', e);
    }

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
