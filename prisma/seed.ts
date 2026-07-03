import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { randomBytes, scrypt } from 'node:crypto';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// Better Auth と同じ scrypt 実装（@better-auth/utils/password と同一）
function generateKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize('NFKC'), salt, 64,
      { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 },
      (err, key) => { if (err) reject(err); else resolve(key as Buffer); });
  });
}
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = await generateKey(password, salt);
  return `${salt}:${key.toString('hex')}`;
}

async function main() {
  console.log('🌱 Seeding...');

  // ─── 管理者・モックユーザー作成 ───────────────────────────────────────────

  const passwordHash = await hashPassword('password123');

  const yamamoto = await prisma.user.upsert({
    where: { email: 'yamamoto@example.com' },
    update: {},
    create: {
      email: 'yamamoto@example.com',
      name: '山本 雄太',
      emailVerified: true,
      accounts: {
        create: {
          accountId: 'yamamoto@example.com',
          providerId: 'credential',
          password: passwordHash,
        },
      },
      profile: {
        create: {
          handle: 'yamamoto',
          favoriteIps: ['ポケモン', 'ONE PIECE'],
          bio: '管理者',
        },
      },
    },
  });

  const fukuda = await prisma.user.upsert({
    where: { email: 'hukuda@example.com' },
    update: {},
    create: {
      email: 'hukuda@example.com',
      name: '福田 大陽',
      emailVerified: true,
      accounts: {
        create: {
          accountId: 'hukuda@example.com',
          providerId: 'credential',
          password: passwordHash,
        },
      },
      profile: {
        create: {
          handle: 'hukuda',
          avatarUrl: 'https://api.dicebear.com/7.x/thumbs/svg?seed=taiyo',
          favoriteIps: ['ポケモン', 'ハイキュー!!', 'チェンソーマン'],
          bio: '推しはハイキューとポケモン。近所のガチャは大体踏破。神引き報告します',
        },
      },
    },
  });

  const iida = await prisma.user.upsert({
    where: { email: 'iida@example.com' },
    update: {},
    create: {
      email: 'iida@example.com',
      name: '飯田 成',
      emailVerified: true,
      accounts: {
        create: {
          accountId: 'iida@example.com',
          providerId: 'credential',
          password: passwordHash,
        },
      },
      profile: {
        create: {
          handle: 'iida',
          favoriteIps: ['呪術廻戦', 'チェンソーマン', 'HUNTER×HUNTER'],
          bio: '呪術廻戦とハンターハンター大好き。コレクション部屋がやばいことになってます',
        },
      },
    },
  });

  // モックユーザー（ゆうな・けんた）
  const yuna = await prisma.user.upsert({
    where: { email: 'yuna@example.com' },
    update: {},
    create: {
      email: 'yuna@example.com',
      name: 'ゆうな',
      emailVerified: true,
      accounts: {
        create: {
          accountId: 'yuna@example.com',
          providerId: 'credential',
          password: passwordHash,
        },
      },
      profile: {
        create: {
          handle: 'yuna',
          avatarUrl: 'https://api.dicebear.com/7.x/thumbs/svg?seed=yuna',
          favoriteIps: ['ジョジョ', 'ポケモン'],
          bio: 'ジョジョのスタンドフィギュア集めてます。池袋・渋谷によく出没',
        },
      },
    },
  });

  const kenta = await prisma.user.upsert({
    where: { email: 'kenta@example.com' },
    update: {},
    create: {
      email: 'kenta@example.com',
      name: 'けんた',
      emailVerified: true,
      accounts: {
        create: {
          accountId: 'kenta@example.com',
          providerId: 'credential',
          password: passwordHash,
        },
      },
      profile: {
        create: {
          handle: 'kenta',
          avatarUrl: 'https://api.dicebear.com/7.x/thumbs/svg?seed=kenta',
          favoriteIps: ['ONE PIECE', 'ドラゴンボール'],
          bio: 'ONE PIECEとドラゴンボール一筋。在庫報告まめにやってます',
        },
      },
    },
  });

  console.log('✅ Users created');

  // ─── プロフィール upsert（再実行時も反映） ───────────────────────────────
  await prisma.userProfile.upsert({
    where: { userId: yamamoto.id },
    update: { handle: 'yamamoto' },
    create: { userId: yamamoto.id, handle: 'yamamoto', favoriteIps: ['ポケモン', 'ONE PIECE'], bio: '管理者' },
  });
  await prisma.userProfile.upsert({
    where: { userId: fukuda.id },
    update: { handle: 'hukuda', avatarUrl: 'https://api.dicebear.com/7.x/thumbs/svg?seed=taiyo' },
    create: { userId: fukuda.id, handle: 'hukuda', avatarUrl: 'https://api.dicebear.com/7.x/thumbs/svg?seed=taiyo', favoriteIps: ['ポケモン', 'ハイキュー!!', 'チェンソーマン'], bio: '推しはハイキューとポケモン。近所のガチャは大体踏破。神引き報告します' },
  });
  await prisma.userProfile.upsert({
    where: { userId: iida.id },
    update: { handle: 'iida', favoriteIps: ['呪術廻戦', 'チェンソーマン', 'HUNTER×HUNTER'], bio: '呪術廻戦とハンターハンター大好き。コレクション部屋がやばいことになってます' },
    create: { userId: iida.id, handle: 'iida', favoriteIps: ['呪術廻戦', 'チェンソーマン', 'HUNTER×HUNTER'], bio: '呪術廻戦とハンターハンター大好き。コレクション部屋がやばいことになってます' },
  });
  await prisma.userProfile.upsert({
    where: { userId: yuna.id },
    update: { handle: 'yuna', avatarUrl: 'https://api.dicebear.com/7.x/thumbs/svg?seed=yuna' },
    create: { userId: yuna.id, handle: 'yuna', avatarUrl: 'https://api.dicebear.com/7.x/thumbs/svg?seed=yuna', favoriteIps: ['ジョジョ', 'ポケモン'], bio: 'ジョジョのスタンドフィギュア集めてます。池袋・渋谷によく出没' },
  });
  await prisma.userProfile.upsert({
    where: { userId: kenta.id },
    update: { handle: 'kenta', avatarUrl: 'https://api.dicebear.com/7.x/thumbs/svg?seed=kenta' },
    create: { userId: kenta.id, handle: 'kenta', avatarUrl: 'https://api.dicebear.com/7.x/thumbs/svg?seed=kenta', favoriteIps: ['ONE PIECE', 'ドラゴンボール'], bio: 'ONE PIECEとドラゴンボール一筋。在庫報告まめにやってます' },
  });
  console.log('✅ Profiles upserted');

  console.log('🌱 Seed complete!');
}

main().catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
