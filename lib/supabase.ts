import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// 画像アップロード用バケット名
export const UPLOAD_BUCKET = 'uploads';

// サーバー専用の Supabase クライアント（service_role キー）。
// createClient は env が無いと即例外を投げるため、ビルド時に評価されないよう
// リクエスト時に遅延生成する（トップレベルでは作らない）。
let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !serviceKey) {
    throw new Error('Supabase の環境変数（NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY）が未設定です');
  }
  _client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

/** 公開URL（…/object/public/uploads/<path>）から uploads バケット内のパスを取り出す。自前バケットのURLのみ。 */
export function uploadPathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${UPLOAD_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  const path = url.slice(i + marker.length).split('?')[0];
  return path ? decodeURIComponent(path) : null;
}

/**
 * アップロード済み画像の実ファイルをストレージから削除する（投稿/退会/アイコン変更時の後始末）。
 * ベストエフォート：パスが取れないURLは無視し、失敗しても例外は投げない（DB処理を止めないため）。
 */
export async function removeUploadedImages(urls: Array<string | null | undefined>): Promise<void> {
  const paths = Array.from(
    new Set(urls.map(uploadPathFromUrl).filter((p): p is string => !!p)),
  );
  if (paths.length === 0) return;
  try {
    const { error } = await getSupabaseAdmin().storage.from(UPLOAD_BUCKET).remove(paths);
    if (error) console.error('[storage.remove]', error.message);
  } catch (e) {
    console.error('[storage.remove]', e);
  }
}
