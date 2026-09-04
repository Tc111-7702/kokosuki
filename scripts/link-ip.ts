import 'dotenv/config';
import { syncIpNameTable } from '@/lib/ipCategory';

// #19 移行用の一回限りスクリプト: 既存全ガチャの ipName から IpName/IpCategory を構築し、
// Gacha.ipNameId を link する（旧 ipName 列を読む唯一の ETL 経路）。
// 通常運用ではスクレイパーが upsert 時に link するため、これは移行時に一度だけ実行すればよい。
// 実行: npx tsx scripts/link-ip.ts （事前に #40 マイグレーション適用が必要）
syncIpNameTable()
  .then((r) => { console.log('[link-ip] 完了', r); process.exit(0); })
  .catch((e) => { console.error('[link-ip] エラー', e); process.exit(1); });
