import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'ファイルがありません' }, { status: 400 });

    const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const name = `${randomUUID()}.${ext}`;
    const dir  = join(process.cwd(), 'public', 'uploads');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, name), Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ url: `/uploads/${name}` });
  } catch (e) {
    console.error('[upload]', e);
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 });
  }
}
