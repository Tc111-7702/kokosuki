import { createClient } from '@supabase/supabase-js';

// サーバー専用の Supabase クライアント（service_role キー）。
// RLS をバイパスするため、絶対にクライアント側へ露出させないこと。
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// 画像アップロード用バケット名
export const UPLOAD_BUCKET = 'uploads';
