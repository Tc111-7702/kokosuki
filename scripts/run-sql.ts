import 'dotenv/config';
import { readFileSync } from 'node:fs';
import pg from 'pg';

// .env の DATABASE_URL に対して、引数で渡した .sql ファイルを順に実行する。
// 各ファイルは1トランザクション（失敗したらそのファイルは丸ごとロールバック）。
// 使い方: npx tsx scripts/run-sql.ts prisma/reset-social.sql prisma/reset-users.sql prisma/reset-gacha.sql
async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('usage: npx tsx scripts/run-sql.ts <file.sql> [<file.sql> ...]');
    process.exit(1);
  }
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const client = await pool.connect();
  try {
    for (const f of files) {
      const sql = readFileSync(f, 'utf8');
      process.stdout.write(`\n--- ${f} 実行中 ---\n`);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`OK: ${f}`);
      } catch (e) {
        await client.query('ROLLBACK');
        throw new Error(`${f} で失敗（ロールバック済み）: ${String(e)}`);
      }
    }
    console.log('\n全ファイル完了');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
