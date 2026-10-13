import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    // migrate/db pull など CLI は session pooler(5432)の DIRECT_URL を優先して使う。
    // pooled(6543, transaction mode)だと advisory lock を取得できず migrate がハングするため。
    // DIRECT_URL 未設定の環境(CI の使い捨てPostgres等)では DATABASE_URL にフォールバック。
    // runtime は @prisma/adapter-pg が DATABASE_URL(6543) を使うので影響なし。
    url:
    process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
