import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // ワークスペースのルートをこのプロジェクト自身に固定（親ディレクトリを参照させない）
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
