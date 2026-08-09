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
