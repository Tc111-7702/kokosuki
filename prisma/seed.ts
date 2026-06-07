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
          favoriteIps: ['ポケモン', 'ワンピース'],
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
          favoriteIps: ['ワンピース', 'ドラゴンボール'],
          bio: 'ワンピースとドラゴンボール一筋。在庫報告まめにやってます',
        },
      },
    },
  });

  console.log('✅ Users created');

  // ─── プロフィール upsert（再実行時も反映） ───────────────────────────────
  await prisma.userProfile.upsert({
    where: { userId: yamamoto.id },
    update: { handle: 'yamamoto' },
    create: { userId: yamamoto.id, handle: 'yamamoto', favoriteIps: ['ポケモン', 'ワンピース'], bio: '管理者' },
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
    create: { userId: kenta.id, handle: 'kenta', avatarUrl: 'https://api.dicebear.com/7.x/thumbs/svg?seed=kenta', favoriteIps: ['ワンピース', 'ドラゴンボール'], bio: 'ワンピースとドラゴンボール一筋。在庫報告まめにやってます' },
  });
  console.log('✅ Profiles upserted');

  // ─── ガチャシリーズ ────────────────────────────────────────────────────────

  const gachaData = [
    { id: 'g1',  seriesName: 'ポケモン ミニフィギュア vol.5',            ipName: 'ポケモン',       kind: 'gacha', category: 'anime',     status: 'on_sale',     price: 300, gradientFrom: '#FFD84D', gradientTo: '#F59E0B', isContinuation: true,  lineup: ['ピカチュウ', 'リザードン', 'イーブイ', 'ミュウ', 'ゲンガー', 'カビゴン'], commentCount: 42, weeklyPulls: 127 },
    { id: 'g2',  seriesName: 'ハイキュー!! めじるしアクスタ 第4弾',      ipName: 'ハイキュー!!',   kind: 'gacha', category: 'anime',     status: 'on_sale',     price: 400, gradientFrom: '#FB923C', gradientTo: '#DC2626', isContinuation: true,  commentCount: 28, weeklyPulls: 84 },
    { id: 'g3',  seriesName: '呪術廻戦 マスコットフィギュア 最強編',      ipName: '呪術廻戦',       kind: 'gacha', category: 'anime',     status: 'on_sale',     price: 500, gradientFrom: '#7C3AED', gradientTo: '#1E1B4B', lineup: ['五条悟', '宿儺', '虎杖悠仁', '伏黒恵', '釘崎野薔薇'], commentCount: 65, weeklyPulls: 201 },
    { id: 'g4',  seriesName: 'ワンピース ガチャ 麦わらver.',              ipName: 'ワンピース',     kind: 'gacha', category: 'anime',     status: 'on_sale',     price: 300, gradientFrom: '#2563EB', gradientTo: '#0C4A6E', lineup: ['ルフィ', 'ゾロ', 'ナミ', 'サンジ', 'チョッパー'], commentCount: 33, weeklyPulls: 156 },
    { id: 'g5',  seriesName: 'チェンソーマン マスコット vol.2',           ipName: 'チェンソーマン', kind: 'gacha', category: 'anime',     status: 'on_sale',     price: 500, gradientFrom: '#475569', gradientTo: '#111827', isContinuation: true,  commentCount: 19, weeklyPulls: 67 },
    { id: 'g6',  seriesName: 'ポケモン ミニフィギュア 第4弾',             ipName: 'ポケモン',       kind: 'gacha', category: 'anime',     status: 'on_sale',     price: 300, gradientFrom: '#FDE047', gradientTo: '#EAB308', lineup: ['リザードン', 'ピカチュウ', 'フシギダネ', 'ゼニガメ', 'ミュウツー', 'ルカリオ'], commentCount: 88, weeklyPulls: 243 },
    { id: 'g7',  seriesName: 'ハイキュー!! アクリルスタンド 合宿編',     ipName: 'ハイキュー!!',   kind: 'gacha', category: 'anime',     status: 'on_sale',     price: 500, gradientFrom: '#F97316', gradientTo: '#9A3412', commentCount: 51, weeklyPulls: 178 },
    { id: 'g8',  seriesName: 'ジョジョ スタンドフィギュア 黄金の風',     ipName: 'ジョジョ',       kind: 'gacha', category: 'anime',     status: 'on_sale',     price: 500, gradientFrom: '#A855F7', gradientTo: '#4C1D95', commentCount: 44, weeklyPulls: 119 },
    { id: 'g9',  seriesName: 'ちいかわ もこもこマスコット',               ipName: 'ちいかわ',       kind: 'gacha', category: 'character', status: 'coming_soon', price: 400, gradientFrom: '#FCA5A5', gradientTo: '#F9A8D4', startWeekLabel: '6月第1週スタート', lineup: ['ちいかわ', 'ハチワレ', 'うさぎ', 'モモンガ'], commentCount: 34, weeklyPulls: 0 },
    { id: 'g10', seriesName: 'HUNTER×HUNTER キャラフィギュア G.I.編',   ipName: 'HUNTER×HUNTER', kind: 'gacha', category: 'anime',     status: 'coming_soon', price: 500, gradientFrom: '#34D399', gradientTo: '#059669', startWeekLabel: '6月第2週スタート', lineup: ['ゴン', 'キルア', 'クラピカ', 'レオリオ', 'ヒソカ'], commentCount: 18, weeklyPulls: 0 },
    { id: 'g11', seriesName: 'スパイファミリー アーニャストラップ',       ipName: 'SPY×FAMILY',    kind: 'gacha', category: 'anime',     status: 'coming_soon', price: 300, gradientFrom: '#60A5FA', gradientTo: '#A78BFA', startWeekLabel: '6月第1週スタート', commentCount: 15, weeklyPulls: 0 },
    { id: 'g12', seriesName: 'サンリオ × LE SSERAFIM キャラチャーム',   ipName: 'サンリオ',       kind: 'gacha', category: 'character', status: 'on_sale',     price: 400, gradientFrom: '#F9A8D4', gradientTo: '#C084FC', isCollab: true, commentCount: 57, weeklyPulls: 148 },
    { id: 'g13', seriesName: 'ポケモン × 原宿 POP-UP 限定ガチャ',       ipName: 'ポケモン',       kind: 'gacha', category: 'anime',     status: 'on_sale',     price: 500, gradientFrom: '#F87171', gradientTo: '#EC4899', isCollab: true, commentCount: 31, weeklyPulls: 95 },
    { id: 'g14', seriesName: 'ちいかわ めじるしアクセサリー（再販）',    ipName: 'ちいかわ',       kind: 'gacha', category: 'character', status: 'on_sale',     price: 300, gradientFrom: '#FDE68A', gradientTo: '#FCA5A5', isReissue: true, commentCount: 39, weeklyPulls: 113 },
    { id: 'g15', seriesName: 'ポケモン 30周年 メタルチャーム（再販）',   ipName: 'ポケモン',       kind: 'gacha', category: 'anime',     status: 'on_sale',     price: 300, gradientFrom: '#FCD34D', gradientTo: '#D97706', isReissue: true, commentCount: 22, weeklyPulls: 98 },
    { id: 'g16', seriesName: 'サンリオキャラクターズ クリスタルめじるし', ipName: 'サンリオ',       kind: 'gacha', category: 'character', status: 'on_sale',     price: 300, gradientFrom: '#C084FC', gradientTo: '#818CF8', commentCount: 24, weeklyPulls: 76 },
    { id: 'g17', seriesName: 'ミッフィー ギンガムチェックコレクション',   ipName: 'ミッフィー',     kind: 'gacha', category: 'character', status: 'on_sale',     price: 400, gradientFrom: '#BAE6FD', gradientTo: '#93C5FD', commentCount: 18, weeklyPulls: 62 },
    { id: 'g18', seriesName: '本物そっくり！スイーツミニチュアガチャ',   ipName: 'スイーツ',       kind: 'gacha', category: 'other',     status: 'on_sale',     price: 300, gradientFrom: '#FDBA74', gradientTo: '#F472B6', commentCount: 15, weeklyPulls: 45 },
    { id: 'g19', seriesName: 'もふもふ犬マスコット vol.3',                ipName: '犬',             kind: 'gacha', category: 'other',     status: 'on_sale',     price: 300, gradientFrom: '#D4A27A', gradientTo: '#92400E', isContinuation: true, commentCount: 11, weeklyPulls: 38 },
  ];

  for (const g of gachaData) {
    await prisma.gacha.upsert({
      where: { id: g.id },
      update: {},
      create: {
        id:             g.id,
        seriesName:     g.seriesName,
        ipName:         g.ipName,
        kind:           g.kind,
        category:       g.category,
        status:         g.status,
        price:          g.price,
        gradientFrom:   g.gradientFrom,
        gradientTo:     g.gradientTo,
        startWeekLabel: g.startWeekLabel ?? null,
        lineup:         g.lineup ?? [],
        isCollab:       g.isCollab ?? false,
        isReissue:      g.isReissue ?? false,
        isContinuation: g.isContinuation ?? false,
        commentCount:   g.commentCount,
        weeklyPulls:    g.weeklyPulls,
      },
    });
  }

  console.log('✅ Gacha created');

  // ─── スポット ──────────────────────────────────────────────────────────────

  const spotData = [
    { id: 's1', name: 'アキバガチャ広場',          address: '東京都千代田区外神田1-15',      lat: 35.7022, lng: 139.7741 },
    { id: 's2', name: 'ガチャガチャの森 池袋店',   address: '東京都豊島区東池袋1-2-3',       lat: 35.7295, lng: 139.7109 },
    { id: 's3', name: 'カプコン公式ガチャコーナー', address: '東京都渋谷区道玄坂2-6',         lat: 35.6595, lng: 139.6977 },
    { id: 's4', name: 'ガチャポンの殿堂 秋葉原',   address: '東京都千代田区外神田4-3-3',     lat: 35.6993, lng: 139.7720 },
    { id: 's5', name: 'イトーヨーカドー錦糸町店',  address: '東京都墨田区江東橋4-27-14',     lat: 35.6943, lng: 139.8157 },
    { id: 's6', name: 'ラウンドワン渋谷店',        address: '東京都渋谷区道玄坂1-20',        lat: 35.6580, lng: 139.6988 },
  ];

  for (const s of spotData) {
    await prisma.spot.upsert({
      where: { id: s.id },
      update: {},
      create: s,
    });
  }

  console.log('✅ Spots created');

  // ─── マシン ────────────────────────────────────────────────────────────────

  const machineData = [
    { id: 'm1', spotId: 's1', gachaId: 'g6', price: 300 },
    { id: 'm2', spotId: 's1', gachaId: 'g2', price: 400 },
    { id: 'm3', spotId: 's3', gachaId: 'g5', price: 500 },
    { id: 'm4', spotId: 's4', gachaId: 'g4', price: 300 },
    { id: 'm5', spotId: 's2', gachaId: 'g8', price: 500 },
  ];

  for (const m of machineData) {
    await prisma.machine.upsert({
      where: { id: m.id },
      update: {},
      create: m,
    });
  }

  console.log('✅ Machines created');

  // ─── 在庫報告 ──────────────────────────────────────────────────────────────

  const ago = (hours: number) => new Date(Date.now() - hours * 3600 * 1000);

  await prisma.stockReport.createMany({
    skipDuplicates: true,
    data: [
      { id: 'r1', machineId: 'm1', spotId: 's1', userId: kenta.id,  status: 'in_stock',     quantity: 'plenty', createdAt: ago(1.5) },
      { id: 'r2', machineId: 'm3', spotId: 's3', userId: yuna.id,   status: 'out_of_stock',                     createdAt: ago(9) },
      { id: 'r3', machineId: 'm1', spotId: 's4', userId: kenta.id,  status: 'in_stock',                         createdAt: ago(30) },
      { id: 'r4', machineId: 'm1', spotId: 's1', userId: fukuda.id, status: 'in_stock',                         createdAt: ago(50) },
    ],
  });

  console.log('✅ StockReports created');

  // ─── Pull（ガチャ結果投稿） ────────────────────────────────────────────────

  await prisma.pull.createMany({
    skipDuplicates: true,
    data: [
      { id: 'p1', machineId: 'm2', spotId: 's1', userId: yuna.id,   gachaId: 'g2', result: 'hit',       itemName: '影山飛雄 アクリルスタンド', imageUrl: 'https://picsum.photos/seed/haikyuu_pull/400/500',  memo: 'ずっと狙ってた影山引けた！！！',    isPublic: true, createdAt: ago(14) },
      { id: 'p2', machineId: 'm4', spotId: 's4', userId: kenta.id,  gachaId: 'g4', result: 'duplicate', itemName: 'ルフィ フィギュア',           imageUrl: 'https://picsum.photos/seed/onepiece_pull/400/500', memo: 'ルフィまたかぶった…3個目',           isPublic: true, createdAt: ago(27) },
      { id: 'p3', machineId: 'm5', spotId: 's2', userId: yuna.id,   gachaId: 'g8', result: 'miss',                                               imageUrl: 'https://picsum.photos/seed/jojo_pull/400/500',    memo: '吉良吉影狙いで3連爆死した',          isPublic: true, createdAt: ago(29) },
      { id: 'p4', machineId: 'm1', spotId: 's1', userId: kenta.id,  gachaId: 'g6', result: 'hit',       itemName: 'リザードン フィギュア',        imageUrl: 'https://picsum.photos/seed/pokemon_pull1/400/500', memo: '第4弾でリザードン一発！造形やばい', isPublic: true, createdAt: ago(2) },
      { id: 'p5', machineId: 'm1', spotId: 's4', userId: yuna.id,   gachaId: 'g6', result: 'duplicate', itemName: 'ピカチュウ フィギュア',         imageUrl: 'https://picsum.photos/seed/pokemon_pull2/400/500', memo: 'ピカチュウ3体目…交換したい人いる？', isPublic: true, createdAt: ago(4) },
      { id: 'p6', machineId: 'm2', spotId: 's1', userId: fukuda.id, gachaId: 'g2', result: 'hit',       itemName: '日向翔陽 アクリルスタンド',    imageUrl: 'https://picsum.photos/seed/taiyo_pull/400/500',   memo: '日向きた！朝イチで並んだ甲斐あった', isPublic: true, createdAt: ago(20) },
    ],
  });

  console.log('✅ Pulls created');

  // ─── いいね ────────────────────────────────────────────────────────────────

  await prisma.like.createMany({
    skipDuplicates: true,
    data: [
      { userId: kenta.id,  pullId: 'p1' },
      { userId: fukuda.id, pullId: 'p1' },
      { userId: yuna.id,   pullId: 'p4' },
      { userId: kenta.id,  pullId: 'p5' },
      { userId: fukuda.id, pullId: 'p3' },
    ],
  });

  console.log('✅ Likes created');

  // ─── ガチャお気に入り ──────────────────────────────────────────────────────

  await prisma.gachaLike.createMany({
    skipDuplicates: true,
    data: [
      // fukuda: ポケモン・ワンピース好き
      { userId: fukuda.id,   gachaId: 'g1' },
      { userId: fukuda.id,   gachaId: 'g4' },
      { userId: fukuda.id,   gachaId: 'g6' },
      // yuna: ジョジョ・ポケモン好き
      { userId: yuna.id,     gachaId: 'g8' },
      { userId: yuna.id,     gachaId: 'g1' },
      { userId: yuna.id,     gachaId: 'g13' },
      // kenta: ワンピース・ドラゴンボール好き
      { userId: kenta.id,    gachaId: 'g4' },
      { userId: kenta.id,    gachaId: 'g6' },
      // yamamoto: ポケモン・ワンピース好き
      { userId: yamamoto.id, gachaId: 'g1' },
      { userId: yamamoto.id, gachaId: 'g15' },
      { userId: yamamoto.id, gachaId: 'g4' },
      // iida: 呪術廻戦・チェンソーマン・HUNTER×HUNTER好き
      { userId: iida.id,     gachaId: 'g3' },
      { userId: iida.id,     gachaId: 'g5' },
      { userId: iida.id,     gachaId: 'g10' },
    ],
  });

  console.log('✅ GachaLikes created');

  // ─── スポットQ&A ───────────────────────────────────────────────────────────

  const q1 = await prisma.qA.upsert({
    where: { id: 'q1' },
    update: {},
    create: { id: 'q1', spotId: 's1', userId: yuna.id,  text: '今、列どれくらいですか？',             createdAt: ago(0.33) },
  });
  const q2 = await prisma.qA.upsert({
    where: { id: 'q2' },
    update: {},
    create: { id: 'q2', spotId: 's1', userId: yuna.id,  text: 'おひとり様、何回までとかありますか？', createdAt: ago(0.83) },
  });
  const q3 = await prisma.qA.upsert({
    where: { id: 'q3' },
    update: {},
    create: { id: 'q3', spotId: 's4', userId: kenta.id, text: 'ポケモンまだ残ってそうでした？',       createdAt: ago(0.42) },
  });

  await prisma.qAAnswer.createMany({
    skipDuplicates: true,
    data: [
      { id: 'a1', qaId: q1.id, userId: kenta.id, text: 'さっき3人くらい。回転早いのですぐでした', createdAt: ago(0.2) },
      { id: 'a2', qaId: q3.id, userId: yuna.id,  text: '15分前で残りわずか！急いだ方がいいかも',  createdAt: ago(0.23) },
    ],
  });

  console.log('✅ QA created');

  // ─── 通知 ──────────────────────────────────────────────────────────────────

  await prisma.notification.createMany({
    skipDuplicates: true,
    data: [
      { id: 'n1', userId: fukuda.id, type: 'restock',   title: '�在庫が復活！',  body: '渋谷で「ポケモン ミニフィギュア vol.5」が今、引けます',                     gachaId: 'g1', read: false, createdAt: new Date('2026-06-01T09:40:00Z') },
      { id: 'n2', userId: fukuda.id, type: 'release',   title: '発売中',        body: '「ワンピース ガチャ 麦わらver.」が発売中。近くにあるかチェック',           gachaId: 'g4', read: false, createdAt: new Date('2026-06-01T07:00:00Z') },
      { id: 'n3', userId: fukuda.id, type: 'upcoming',  title: '来週発売',      body: '「ちいかわ もこもこマスコット」が6月第1週スタート。お知らせをオンにしました', gachaId: 'g9', read: true,  createdAt: new Date('2026-05-31T20:00:00Z') },
      { id: 'n4', userId: fukuda.id, type: 'community', title: 'みんなの動き',  body: 'お気に入りのポケモンを今週243人が引いています',                           gachaId: 'g6', read: true,  createdAt: new Date('2026-05-31T10:00:00Z') },
    ],
  });

  console.log('✅ Notifications created');

  console.log('🌱 Seed complete!');
}

main().catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
