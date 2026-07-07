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
    update: { handle: 'hukuda', avatarUrl: 'https://api.dicebear.com/7.x/thumbs/svg?seed=taiyo' },
    create: { userId: fukuda.id, handle: 'hukuda', avatarUrl: 'https://api.dicebear.com/7.x/thumbs/svg?seed=taiyo', bio: '推しはハイキューとポケモン。近所のガチャは大体踏破。神引き報告します' },
  });
  await prisma.userProfile.upsert({
    where: { userId: iida.id },
    update: { handle: 'iida' },
    create: { userId: iida.id, handle: 'iida', bio: '呪術廻戦とハンターハンター大好き。コレクション部屋がやばいことになってます' },
  });
  await prisma.userProfile.upsert({
    where: { userId: yuna.id },
    update: { handle: 'yuna', avatarUrl: 'https://api.dicebear.com/7.x/thumbs/svg?seed=yuna' },
    create: { userId: yuna.id, handle: 'yuna', avatarUrl: 'https://api.dicebear.com/7.x/thumbs/svg?seed=yuna', bio: 'ジョジョのスタンドフィギュア集めてます。池袋・渋谷によく出没' },
  });
  await prisma.userProfile.upsert({
    where: { userId: kenta.id },
    update: { handle: 'kenta', avatarUrl: 'https://api.dicebear.com/7.x/thumbs/svg?seed=kenta' },
    create: { userId: kenta.id, handle: 'kenta', avatarUrl: 'https://api.dicebear.com/7.x/thumbs/svg?seed=kenta', bio: 'ONE PIECEとドラゴンボール一筋。在庫報告まめにやってます' },
  });
  console.log('Profiles upserted');

  // ─── 投稿・フォロー・GachaLike（再実行時に重複しないよう先に削除） ──────────
  const seedUserIds = [yamamoto.id, fukuda.id, iida.id, yuna.id, kenta.id];
  await prisma.stockPostLike.deleteMany({ where: { userId: { in: seedUserIds } } });
  await prisma.stockPost.deleteMany(    { where: { userId: { in: seedUserIds } } });
  await prisma.like.deleteMany(         { where: { userId: { in: seedUserIds } } });
  await prisma.post.deleteMany(         { where: { userId: { in: seedUserIds } } });
  await prisma.follow.deleteMany({
    where: { OR: [{ followerId: { in: seedUserIds } }, { followingId: { in: seedUserIds } }] },
  });

  // 実在スポット（川西市・宝塚市）
  const SPOTS = {
    kappa:       'cmr63juft00anc0ujnxh6mfac',
    kobayashi:   'cmr63jj8g009gc0ujvvuzraqt',
    bunkyodo:    'cmr63kj6a00d8c0ujsiitsz6v',
    tada:        'cmr63jizn009fc0ujaebsjkmh',
    rasora:      'cmr63jm6q009sc0uj0xuxrivb',
    aste:        'cmr63jrj900acc0ujnkxf2y20',
  };

  // 実在マシン
  const M: Record<string, { id: string; spotId: string; gachaId: string }> = {
    pokemon_kappa:     { id: 'cmr66fzoz0rvewcujjidjip76', spotId: SPOTS.kappa,     gachaId: 'cmr63tlsj00f2wcujcs287z14' },
    csm_kobayashi:     { id: 'cmr65jp5v0ky6wcujkias3gnv', spotId: SPOTS.kobayashi, gachaId: 'cmr63vkxm00o3wcujsgmo4hhf' },
    doraemon_kobayashi:{ id: 'cmr65jow50kxywcujzcda7w0t', spotId: SPOTS.kobayashi, gachaId: 'cmr64138a01mjwcuj2ar37ki9' },
    natsume_kobayashi: { id: 'cmr65jotq0kxwwcujrtcgc5ex', spotId: SPOTS.kobayashi, gachaId: 'cmr63tb9500e0wcujdjygseoh' },
    op_bunkyodo:       { id: 'cmr68iwx50z7xwcujso0xqtui', spotId: SPOTS.bunkyodo,  gachaId: 'cmr63suq300cfwcuj192j2x7n' },
    minecraft_bunkyodo:{ id: 'cmr68iwte0z7uwcujqulhwxs3', spotId: SPOTS.bunkyodo,  gachaId: 'cmr63sv8d00chwcuj2bbmme8u' },
    miku_bunkyodo:     { id: 'cmr68izn00zciwcujqvwnljc4', spotId: SPOTS.bunkyodo,  gachaId: 'cmr647546030jwcujk3de9evb' },
    pokemon_tada:      { id: 'cmr65jo7i0kxmwcujz4v4tbyi', spotId: SPOTS.tada,      gachaId: 'cmr63wlnl00tnwcujhlrcx5kn' },
    haikyu_tada:       { id: 'cmr65jo8q0kxnwcujk7ooarwt', spotId: SPOTS.tada,      gachaId: 'cmr63uz7i00kwwcujwyyl9n8c' },
    disney_rasora:     { id: 'cmr65kem20lamwcuj7wite11h', spotId: SPOTS.rasora,    gachaId: 'cmr63y5j60131wcujnmxg1fbr' },
    kirby_rasora:      { id: 'cmr65kefw0lahwcuj2k9ijlhe', spotId: SPOTS.rasora,    gachaId: 'cmr63qhei0049wcuj3tu2240p' },
    hxh_aste:          { id: 'cmr65s5uw0pp3wcujt7qf327r', spotId: SPOTS.aste,      gachaId: 'cmr63y7r6013awcuj1pz9hdqx' },
    op_aste:           { id: 'cmr65s93c0prmwcuj603mm6m8', spotId: SPOTS.aste,      gachaId: 'cmr63suq300cfwcuj192j2x7n' },
    minecraft_aste:    { id: 'cmr65s6kn0ppnwcujguci6tez', spotId: SPOTS.aste,      gachaId: 'cmr63s8qe00a7wcuj4i0e0zp4' },
  };

  // ─── GachaLike（ハート＝お気に入り） ────────────────────────────────────────
  // 再実行時の重複を防ぐため先に削除
  await prisma.gachaLike.deleteMany({ where: { userId: { in: seedUserIds } } });

  await prisma.gachaLike.createMany({
    skipDuplicates: true,
    data: [
      // yamamoto：ポケモン・ONE PIECE 系
      { userId: yamamoto.id, gachaId: M.pokemon_kappa.gachaId },
      { userId: yamamoto.id, gachaId: M.pokemon_tada.gachaId },
      { userId: yamamoto.id, gachaId: M.op_bunkyodo.gachaId },
      { userId: yamamoto.id, gachaId: M.haikyu_tada.gachaId },
      { userId: yamamoto.id, gachaId: M.minecraft_bunkyodo.gachaId },

      // fukuda：ポケモン・ハイキュー・チェンソーマン 系
      { userId: fukuda.id, gachaId: M.pokemon_tada.gachaId },
      { userId: fukuda.id, gachaId: M.pokemon_kappa.gachaId },
      { userId: fukuda.id, gachaId: M.haikyu_tada.gachaId },
      { userId: fukuda.id, gachaId: M.csm_kobayashi.gachaId },
      { userId: fukuda.id, gachaId: M.doraemon_kobayashi.gachaId },
      { userId: fukuda.id, gachaId: M.minecraft_aste.gachaId },

      // iida：HUNTER×HUNTER・チェンソーマン・ONE PIECE 系
      { userId: iida.id, gachaId: M.hxh_aste.gachaId },
      { userId: iida.id, gachaId: M.csm_kobayashi.gachaId },
      { userId: iida.id, gachaId: M.op_bunkyodo.gachaId },
      { userId: iida.id, gachaId: M.natsume_kobayashi.gachaId },
      { userId: iida.id, gachaId: M.minecraft_aste.gachaId },

      // yuna：ポケモン・ONE PIECE・ディズニー・初音ミク 系
      { userId: yuna.id, gachaId: M.pokemon_kappa.gachaId },
      { userId: yuna.id, gachaId: M.pokemon_tada.gachaId },
      { userId: yuna.id, gachaId: M.op_bunkyodo.gachaId },
      { userId: yuna.id, gachaId: M.disney_rasora.gachaId },
      { userId: yuna.id, gachaId: M.miku_bunkyodo.gachaId },
      { userId: yuna.id, gachaId: M.kirby_rasora.gachaId },

      // kenta：ONE PIECE・星のカービィ・ポケモン 系
      { userId: kenta.id, gachaId: M.op_bunkyodo.gachaId },
      { userId: kenta.id, gachaId: M.op_aste.gachaId },
      { userId: kenta.id, gachaId: M.pokemon_kappa.gachaId },
      { userId: kenta.id, gachaId: M.kirby_rasora.gachaId },
      { userId: kenta.id, gachaId: M.haikyu_tada.gachaId },
      { userId: kenta.id, gachaId: M.minecraft_bunkyodo.gachaId },
    ],
  });
  console.log('GachaLikes created');

  // ─── 在庫ポスト（StockPost）────────────────────────────────────────────────
  // 在庫投稿はアプリの主力コンテンツ。1人あたり6〜7件、合計34件
  await prisma.stockPost.createMany({ data: [
    // ── yamamoto（ポケモン・ONE PIECE中心）──────────────
    { userId: yamamoto.id, machineId: M.pokemon_kappa.id,      spotId: M.pokemon_kappa.spotId,      gachaId: M.pokemon_kappa.gachaId,      stockStatus: 'in_stock' },
    { userId: yamamoto.id, machineId: M.op_bunkyodo.id,        spotId: M.op_bunkyodo.spotId,        gachaId: M.op_bunkyodo.gachaId,        stockStatus: 'in_stock' },
    { userId: yamamoto.id, machineId: M.haikyu_tada.id,        spotId: M.haikyu_tada.spotId,        gachaId: M.haikyu_tada.gachaId,        stockStatus: 'low_stock' },
    { userId: yamamoto.id, machineId: M.minecraft_bunkyodo.id, spotId: M.minecraft_bunkyodo.spotId, gachaId: M.minecraft_bunkyodo.gachaId, stockStatus: 'in_stock' },
    { userId: yamamoto.id, machineId: M.kirby_rasora.id,       spotId: M.kirby_rasora.spotId,       gachaId: M.kirby_rasora.gachaId,       stockStatus: 'out_of_stock' },
    { userId: yamamoto.id, machineId: M.disney_rasora.id,      spotId: M.disney_rasora.spotId,      gachaId: M.disney_rasora.gachaId,      stockStatus: 'in_stock' },
    { userId: yamamoto.id, machineId: M.hxh_aste.id,           spotId: M.hxh_aste.spotId,           gachaId: M.hxh_aste.gachaId,           stockStatus: 'low_stock' },

    // ── fukuda（ポケモン・ハイキュー・チェンソー中心）──
    { userId: fukuda.id, machineId: M.pokemon_tada.id,      spotId: M.pokemon_tada.spotId,      gachaId: M.pokemon_tada.gachaId,      stockStatus: 'in_stock' },
    { userId: fukuda.id, machineId: M.haikyu_tada.id,       spotId: M.haikyu_tada.spotId,       gachaId: M.haikyu_tada.gachaId,       stockStatus: 'in_stock' },
    { userId: fukuda.id, machineId: M.csm_kobayashi.id,     spotId: M.csm_kobayashi.spotId,     gachaId: M.csm_kobayashi.gachaId,     stockStatus: 'low_stock' },
    { userId: fukuda.id, machineId: M.minecraft_aste.id,    spotId: M.minecraft_aste.spotId,    gachaId: M.minecraft_aste.gachaId,    stockStatus: 'out_of_stock' },
    { userId: fukuda.id, machineId: M.op_aste.id,           spotId: M.op_aste.spotId,           gachaId: M.op_aste.gachaId,           stockStatus: 'in_stock' },
    { userId: fukuda.id, machineId: M.natsume_kobayashi.id, spotId: M.natsume_kobayashi.spotId, gachaId: M.natsume_kobayashi.gachaId, stockStatus: 'in_stock' },

    // ── iida（HxH・チェンソー・ONE PIECE中心）──────────
    { userId: iida.id, machineId: M.hxh_aste.id,          spotId: M.hxh_aste.spotId,          gachaId: M.hxh_aste.gachaId,          stockStatus: 'in_stock' },
    { userId: iida.id, machineId: M.csm_kobayashi.id,     spotId: M.csm_kobayashi.spotId,     gachaId: M.csm_kobayashi.gachaId,     stockStatus: 'in_stock' },
    { userId: iida.id, machineId: M.op_bunkyodo.id,       spotId: M.op_bunkyodo.spotId,       gachaId: M.op_bunkyodo.gachaId,       stockStatus: 'low_stock' },
    { userId: iida.id, machineId: M.natsume_kobayashi.id, spotId: M.natsume_kobayashi.spotId, gachaId: M.natsume_kobayashi.gachaId, stockStatus: 'out_of_stock' },
    { userId: iida.id, machineId: M.minecraft_aste.id,   spotId: M.minecraft_aste.spotId,    gachaId: M.minecraft_aste.gachaId,    stockStatus: 'in_stock' },
    { userId: iida.id, machineId: M.pokemon_kappa.id,    spotId: M.pokemon_kappa.spotId,     gachaId: M.pokemon_kappa.gachaId,     stockStatus: 'low_stock' },
    { userId: iida.id, machineId: M.miku_bunkyodo.id,    spotId: M.miku_bunkyodo.spotId,     gachaId: M.miku_bunkyodo.gachaId,     stockStatus: 'in_stock' },

    // ── yuna（ポケモン・ディズニー・ミク中心）──────────
    { userId: yuna.id, machineId: M.pokemon_kappa.id,     spotId: M.pokemon_kappa.spotId,     gachaId: M.pokemon_kappa.gachaId,     stockStatus: 'in_stock' },
    { userId: yuna.id, machineId: M.op_aste.id,           spotId: M.op_aste.spotId,           gachaId: M.op_aste.gachaId,           stockStatus: 'in_stock' },
    { userId: yuna.id, machineId: M.disney_rasora.id,     spotId: M.disney_rasora.spotId,     gachaId: M.disney_rasora.gachaId,     stockStatus: 'out_of_stock' },
    { userId: yuna.id, machineId: M.miku_bunkyodo.id,     spotId: M.miku_bunkyodo.spotId,     gachaId: M.miku_bunkyodo.gachaId,     stockStatus: 'in_stock' },
    { userId: yuna.id, machineId: M.kirby_rasora.id,      spotId: M.kirby_rasora.spotId,      gachaId: M.kirby_rasora.gachaId,      stockStatus: 'low_stock' },
    { userId: yuna.id, machineId: M.doraemon_kobayashi.id,spotId: M.doraemon_kobayashi.spotId,gachaId: M.doraemon_kobayashi.gachaId,stockStatus: 'in_stock' },
    { userId: yuna.id, machineId: M.haikyu_tada.id,       spotId: M.haikyu_tada.spotId,       gachaId: M.haikyu_tada.gachaId,       stockStatus: 'in_stock' },

    // ── kenta（ONE PIECE・カービィ・ポケモン中心）──────
    { userId: kenta.id, machineId: M.op_bunkyodo.id,      spotId: M.op_bunkyodo.spotId,      gachaId: M.op_bunkyodo.gachaId,      stockStatus: 'in_stock' },
    { userId: kenta.id, machineId: M.op_aste.id,          spotId: M.op_aste.spotId,          gachaId: M.op_aste.gachaId,          stockStatus: 'in_stock' },
    { userId: kenta.id, machineId: M.pokemon_kappa.id,    spotId: M.pokemon_kappa.spotId,    gachaId: M.pokemon_kappa.gachaId,    stockStatus: 'low_stock' },
    { userId: kenta.id, machineId: M.kirby_rasora.id,     spotId: M.kirby_rasora.spotId,     gachaId: M.kirby_rasora.gachaId,     stockStatus: 'in_stock' },
    { userId: kenta.id, machineId: M.hxh_aste.id,         spotId: M.hxh_aste.spotId,         gachaId: M.hxh_aste.gachaId,         stockStatus: 'in_stock' },
    { userId: kenta.id, machineId: M.csm_kobayashi.id,    spotId: M.csm_kobayashi.spotId,    gachaId: M.csm_kobayashi.gachaId,    stockStatus: 'out_of_stock' },
    { userId: kenta.id, machineId: M.minecraft_bunkyodo.id,spotId: M.minecraft_bunkyodo.spotId,gachaId: M.minecraft_bunkyodo.gachaId,stockStatus: 'in_stock' },
  ]});
  console.log('StockPosts created');

  // ─── 通常ポスト（Post）─────────────────────────────────────────────────────
  // 通常投稿は補助的。1人あたり2件、合計10件
  await prisma.post.createMany({ data: [
    { userId: yamamoto.id, machineId: M.pokemon_kappa.id, spotId: M.pokemon_kappa.spotId, gachaId: M.pokemon_kappa.gachaId, result: '神引き', itemName: 'イーブイ',   imageUrl: null, memo: 'イーブイ出た！かっぱ寿司帰りに寄ったら神引き' },
    { userId: yamamoto.id, machineId: M.op_bunkyodo.id,   spotId: M.op_bunkyodo.spotId,   gachaId: M.op_bunkyodo.gachaId,   result: '神引き', itemName: 'ルフィ',     imageUrl: null, memo: 'まちぼうけのルフィゲット！塗装きれい' },
    { userId: fukuda.id,   machineId: M.pokemon_tada.id,  spotId: M.pokemon_tada.spotId,  gachaId: M.pokemon_tada.gachaId,  result: '神引き', itemName: 'メタモン',   imageUrl: null, memo: 'メタモンコレ揃ってきた！あと2種類' },
    { userId: fukuda.id,   machineId: M.haikyu_tada.id,   spotId: M.haikyu_tada.spotId,   gachaId: M.haikyu_tada.gachaId,   result: '神引き', itemName: '影山飛雄',   imageUrl: null, memo: '影山きた！制服ver最高すぎ' },
    { userId: iida.id,     machineId: M.hxh_aste.id,      spotId: M.hxh_aste.spotId,      gachaId: M.hxh_aste.gachaId,      result: '神引き', itemName: 'ゴン',       imageUrl: null, memo: 'ゴンきた！幻影旅団編全種コンプ目指してる' },
    { userId: iida.id,     machineId: M.op_bunkyodo.id,   spotId: M.op_bunkyodo.spotId,   gachaId: M.op_bunkyodo.gachaId,   result: '神引き', itemName: 'ゾロ',       imageUrl: null, memo: 'ゾロのまちぼうけ！立体感すごい' },
    { userId: yuna.id,     machineId: M.pokemon_kappa.id, spotId: M.pokemon_kappa.spotId, gachaId: M.pokemon_kappa.gachaId, result: '神引き', itemName: 'ピカチュウ', imageUrl: null, memo: 'ピカチュウ！ぽかぽかびよりシリーズかわいすぎ' },
    { userId: yuna.id,     machineId: M.miku_bunkyodo.id, spotId: M.miku_bunkyodo.spotId, gachaId: M.miku_bunkyodo.gachaId, result: '神引き', itemName: '初音ミク',   imageUrl: null, memo: 'ミクのフィギュア！文教堂はラインナップ最高' },
    { userId: kenta.id,    machineId: M.op_bunkyodo.id,   spotId: M.op_bunkyodo.spotId,   gachaId: M.op_bunkyodo.gachaId,   result: '神引き', itemName: 'エース',     imageUrl: null, memo: 'エースのまちぼうけゲット！文教堂逆瀬川は在庫多い' },
    { userId: kenta.id,    machineId: M.kirby_rasora.id,  spotId: M.kirby_rasora.spotId,  gachaId: M.kirby_rasora.gachaId,  result: '神引き', itemName: 'カービィ',   imageUrl: null, memo: 'カービィのミニコンテナ！思ったより小さいけどかわいい' },
  ]});
  console.log('Posts created');

  // ─── フォロー ──────────────────────────────────────────────────────────────
  await prisma.follow.createMany({
    skipDuplicates: true,
    data: [
      { followerId: yamamoto.id, followingId: fukuda.id },
      { followerId: fukuda.id,   followingId: yamamoto.id },
      { followerId: yamamoto.id, followingId: iida.id },
      { followerId: iida.id,     followingId: yamamoto.id },
      { followerId: yamamoto.id, followingId: yuna.id },
      { followerId: yuna.id,     followingId: yamamoto.id },
      { followerId: yamamoto.id, followingId: kenta.id },
      { followerId: kenta.id,    followingId: yamamoto.id },
    ],
  });
  console.log('Follows created');

  console.log('Seed complete!');
}

main().catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
