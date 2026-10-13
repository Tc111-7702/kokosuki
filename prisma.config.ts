import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    // migrate/db pull など CLI は session pooler(5432)の DIRECT_URL を使う。
    // pooled(6543, transaction mode)だと advisory lock を取得できず migrate がハングするため。
    // runtime は @prisma/adapter-pg が DATABASE_URL(6543) を使うので影響なし。
    url:
    process.env.DIRECT_URL,
  },
});
