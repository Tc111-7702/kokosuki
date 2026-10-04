import type { NextConfig } from "next";
import path from "path";

const isDev = process.env.NODE_ENV !== 'production';

// ログイン画面などのクリックジャッキング対策。HSTS はホスト側で付与済み。
// Next.js の起動スクリプトとテーマ初期化がインラインのため script-src に 'unsafe-inline' が必要。
// 埋め込み自体は frame-ancestors 'none' と X-Frame-Options で拒否する。
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.mapbox.com https://*.supabase.co",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/reset-password/:token',
        destination: '/api/auth/reset-password/:token',
        permanent: false,
      },
    ];
  },
  turbopack: {},
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // Supabase Storage（公開バケットの画像URL）
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  // ワークスペースのルートをこのプロジェクト自身に固定（親ディレクトリを参照させない）
  outputFileTracingRoot: path.join(__dirname),
  // @better-auth/kysely-adapter が kysely の削除済みエクスポートを参照するため
  // Turbopack の externals-tracing を止める（kysely も一緒に外部扱いにしないと
  // トレースが kysely/dist/index.js まで追いかけてしまう）
  serverExternalPackages: ['@better-auth/kysely-adapter', 'kysely'],
};

export default nextConfig;
