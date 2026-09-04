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

// seed実行時刻を基準に「n日前」の日時を作る。
// フィードの在庫は鮮度窓（直近 STOCK_FEED_FRESH_DAYS=7 日）で絞られるので、
// 7日以内（フィードに出る）と 7日超（出ない）を意図的に混在させて挙動確認する。
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

// Better Auth と同じ scrypt 実装
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
  console.log('Seeding...');

  // ─── モックユーザー作成 ────────────────────────────────────────────────────
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
          bio: '管理者',
        },
      },
    },
  });

  const fukuda = await prisma.user.upsert({
    where: { email: 'hukuda@example.com' },
    update: { image: 'https://api.dicebear.com/7.x/thumbs/svg?seed=taiyo' },
    create: {
      email: 'hukuda@example.com',
      name: '福田 大陽',
      emailVerified: true,
      image: 'https://api.dicebear.com/7.x/thumbs/svg?seed=taiyo',
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
          bio: '呪術廻戦とハンターハンター大好き。コレクション部屋がやばいことになってます',
        },
      },
    },
  });

  const yuna = await prisma.user.upsert({
    where: { email: 'yuna@example.com' },
    update: { image: 'https://api.dicebear.com/7.x/thumbs/svg?seed=yuna' },
    create: {
      email: 'yuna@example.com',
      name: 'ゆうな',
      emailVerified: true,
      image: 'https://api.dicebear.com/7.x/thumbs/svg?seed=yuna',
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
          bio: 'ジョジョのスタンドフィギュア集めてます。池袋・渋谷によく出没',
        },
      },
    },
  });

  const kenta = await prisma.user.upsert({
    where: { email: 'kenta@example.com' },
    update: { image: 'https://api.dicebear.com/7.x/thumbs/svg?seed=kenta' },
    create: {
      email: 'kenta@example.com',
      name: 'けんた',
      emailVerified: true,
      image: 'https://api.dicebear.com/7.x/thumbs/svg?seed=kenta',
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
          bio: 'ONE PIECEとドラゴンボール一筋。在庫報告まめにやってます',
        },
      },
    },
  });

  console.log('Users created');

  // ─── プロフィール upsert（再実行時も反映） ─────────────────────────────────
  await prisma.userProfile.upsert({
    where: { userId: yamamoto.id },
    update: { handle: 'yamamoto' },
    create: { userId: yamamoto.id, handle: 'yamamoto', bio: '管理者' },
  });
  await prisma.userProfile.upsert({
    where: { userId: fukuda.id },
    update: { handle: 'hukuda' },
    create: { userId: fukuda.id, handle: 'hukuda', bio: '推しはハイキューとポケモン。近所のガチャは大体踏破。神引き報告します' },
  });
  await prisma.userProfile.upsert({
    where: { userId: iida.id },
    update: { handle: 'iida' },
    create: { userId: iida.id, handle: 'iida', bio: '呪術廻戦とハンターハンター大好き。コレクション部屋がやばいことになってます' },
  });
  await prisma.userProfile.upsert({
    where: { userId: yuna.id },
    update: { handle: 'yuna' },
    create: { userId: yuna.id, handle: 'yuna', bio: 'ジョジョのスタンドフィギュア集めてます。池袋・渋谷によく出没' },
  });
  await prisma.userProfile.upsert({
    where: { userId: kenta.id },
    update: { handle: 'kenta' },
    create: { userId: kenta.id, handle: 'kenta', bio: 'ONE PIECEとドラゴンボール一筋。在庫報告まめにやってます' },
  });
  console.log('Profiles upserted');

  // ─── 投稿・GachaLike（再実行時に重複しないよう先に削除） ──────────
  const users = [yamamoto, fukuda, iida, yuna, kenta];
  const seedUserIds = users.map((u) => u.id);
  await prisma.stockPostLike.deleteMany({ where: { userId: { in: seedUserIds } } });
  await prisma.stockPost.deleteMany(    { where: { userId: { in: seedUserIds } } });
  await prisma.like.deleteMany(         { where: { userId: { in: seedUserIds } } });
  await prisma.post.deleteMany(         { where: { userId: { in: seedUserIds } } });
  await prisma.gachaLike.deleteMany(    { where: { userId: { in: seedUserIds } } });

  // ─── 実在マシンをプールとして取得 ───────────────────────────────────────────
  // 発売中ガチャのマシンを id 昇順（決定的）で取得。フィードの在庫は「マシンごと最新1件」に
  // 畳まれるため、別マシンでありさえすれば同一店舗でも件数は減らない（＝ユニークマシン数＝表示数）。
  const POOL_SIZE = 70;
  const pool = await prisma.machine.findMany({
    where: { gacha: { isOnSale: true } },
    orderBy: { id: 'asc' },
    take: POOL_SIZE,
    include: {
      gacha: { select: { id: true, seriesName: true } },
      spot:  { select: { id: true, name: true } },
    },
  });
  if (pool.length < 60) throw new Error(`machine pool too small: ${pool.length}（発売中マシンが不足）`);

  // ─── GachaLike（ハート＝お気に入り） ────────────────────────────────────────
  // 各ユーザーにプールのガチャを数件割り当て、フィードの好み順(tier0/tier1)が出るようにする
  // （在庫プールのガチャと重ねる）。開始位置をユーザーごとにずらす。
  const likeRows: { userId: string; gachaId: string }[] = [];
  users.forEach((u, ui) => {
    const seen = new Set<string>();
    for (let k = 0; k < 8; k++) {
      const m = pool[(ui * 3 + k * 5) % pool.length];
      if (seen.has(m.gacha.id)) continue;
      seen.add(m.gacha.id);
      likeRows.push({ userId: u.id, gachaId: m.gacha.id });
    }
  });
  await prisma.gachaLike.createMany({ data: likeRows, skipDuplicates: true });
  console.log(`GachaLikes created (${likeRows.length})`);

  // ─── 在庫ポスト（StockPost）───────────────────────────────────────────────
  // 主力コンテンツ。約50件をフィードに“見える”状態で作る。
  //  (a) 50マシンに各1件、全て7日以内(0〜6日前) → dedup後も50件表示される
  //  (b) 先頭6マシンに古い重複(8〜13日前・別ユーザー) → 同マシン最新に負けて消える（dedupデモ）
  //  (c) 別の8マシンに古い在庫だけ(10〜31日前) → 鮮度窓で除外され出ない（窓デモ）
  const STOCK_VISIBLE = 50;
  const STATUSES = ['in_stock', 'in_stock', 'in_stock', 'low_stock', 'out_of_stock'];
  const visibleMachines = pool.slice(0, STOCK_VISIBLE);

  type StockRow = { userId: string; machineId: string; spotId: string; gachaId: string; stockStatus: string; createdAt: Date };
  const stockData: StockRow[] = [];

  // (a) 見える50件
  visibleMachines.forEach((m, i) => {
    stockData.push({
      userId: users[i % users.length].id,
      machineId: m.id, spotId: m.spotId, gachaId: m.gachaId,
      stockStatus: STATUSES[i % STATUSES.length],
      createdAt: new Date(daysAgo(i % 7).getTime() - i * 60_000), // 0〜6日前（分単位でずらし一意化）
    });
  });
  // (b) dedupデモ: 先頭6マシンに古い重複
  visibleMachines.slice(0, 6).forEach((m, i) => {
    stockData.push({
      userId: users[(i + 1) % users.length].id,
      machineId: m.id, spotId: m.spotId, gachaId: m.gachaId,
      stockStatus: 'out_of_stock',
      createdAt: daysAgo(8 + i), // 8〜13日前（古い重複）
    });
  });
  // (c) 窓デモ: 別の8マシンに古い在庫だけ
  pool.slice(STOCK_VISIBLE, STOCK_VISIBLE + 8).forEach((m, i) => {
    stockData.push({
      userId: users[i % users.length].id,
      machineId: m.id, spotId: m.spotId, gachaId: m.gachaId,
      stockStatus: 'in_stock',
      createdAt: daysAgo(10 + i * 3), // 10,13,…,31日前
    });
  });
  await prisma.stockPost.createMany({ data: stockData });
  {
    const fresh = await prisma.stockPost.findMany({
      where: { userId: { in: seedUserIds }, createdAt: { gte: daysAgo(7) } },
      select: { machineId: true },
    });
    console.log(`StockPosts created（${stockData.length}行 / 7日以内=${fresh.length}件 / ユニークマシン=${new Set(fresh.map((f) => f.machineId)).size}＝フィード在庫の想定件数）`);
  }

  // ─── 通常ポスト（Post）─────────────────────────────────────────────────────
  // 鮮度窓なし＝古くても出る。約30件。3件に1件は7日超（古くても表示されることの確認用）。
  const FEED_COUNT = 30;
  const RESULTS = ['神引き', '神引き', 'ダブり', '爆死'];
  const VERBS = ['引いた', 'ゲットした', 'コンプ間近', '交換募集中'];
  const postData = pool.slice(0, FEED_COUNT).map((m, i) => ({
    userId: users[i % users.length].id,
    machineId: m.id, spotId: m.spotId, gachaId: m.gachaId,
    result: RESULTS[i % RESULTS.length],
    itemName: null as string | null,
    imageUrl: null as string | null,
    memo: `${m.gacha.seriesName} を${VERBS[i % VERBS.length]}！ @${m.spot.name}`,
    createdAt: new Date(daysAgo(i % 3 === 0 ? 10 + i : i % 7).getTime() - i * 60_000), // 3件に1件は古い(>7日)
  }));
  await prisma.post.createMany({ data: postData });
  console.log(`Posts created (${postData.length})`);

  // ─── マシン在庫ステータス（作成した在庫を地図にも反映）────────────────────
  // 見える50マシンの stockStatus を、その在庫投稿の値に合わせて更新（地図ビュー整合）。
  await Promise.all(
    visibleMachines.map((m, i) =>
      prisma.machine.update({
        where: { id: m.id },
        data: { stockStatus: STATUSES[i % STATUSES.length], stockSyncedAt: new Date() },
      })
    )
  );
  console.log('Machine stock updated');

  console.log('Seed complete!');
}

main().catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
