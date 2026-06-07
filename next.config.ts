import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // ワークスペースのルートをこのプロジェクト自身に固定（親ディレクトリを参照させない）
  outputFileTracingRoot: path.join(__dirname),
  // @better-auth/kysely-adapter の SQLite dialect が kysely の削除済みエクスポートを
  // 参照するため Turbopack の静的解析を回避（dynamic import なので実行時は問題なし）
  serverExternalPackages: ['@better-auth/kysely-adapter'],
};

export default nextConfig;
