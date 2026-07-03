import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // ワークスペースのルートをこのプロジェクト自身に固定（親ディレクトリを参照させない）
  outputFileTracingRoot: path.join(__dirname),
  // @better-auth/kysely-adapter が kysely の削除済みエクスポートを参照するため
  // Turbopack の externals-tracing を止める（kysely も一緒に外部扱いにしないと
  // トレースが kysely/dist/index.js まで追いかけてしまう）
  serverExternalPackages: ['@better-auth/kysely-adapter', 'kysely'],
};

export default nextConfig;
