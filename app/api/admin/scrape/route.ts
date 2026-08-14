import { spawn } from 'node:child_process';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { setSchedule, type ScrapeType } from '@/lib/scrapeSchedule';

// 管理者用スクレイピング実行 API。
//  - immediate: npm run scrape:gacha / scrape:phone を子プロセス起動し、stdout をストリーム返却（ターミナル表示）
//  - scheduled: 予約設定を scrape-schedule.json に保存（worker が起動時に読み込む）
// ※ 子プロセス起動・ファイル書き込みを行うため、自ホスト/ローカル運用が前提（Vercel サーバーレス不可）。

export const dynamic = 'force-dynamic';

// 同時実行ガード（このサーバープロセス内で1件のみ）。原則スクレイピングは途中停止不可。
let running = false;

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === 'number' ? Math.floor(v) : parseInt(String(v), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normalizeTime(v: unknown, fallback: string): string {
  return typeof v === 'string' && /^\d{1,2}:\d{2}$/.test(v) ? v : fallback;
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) return new Response('Unauthorized', { status: 401 });
  if (role !== 'admin') return new Response('Forbidden', { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    type?: string;
    mode?: string;
    everyWeeks?: number;
    dayOfWeek?: number;
    atTime?: string;
  };

  const type: ScrapeType = body.type === 'phone' ? 'phone' : 'gacha';
  const mode = body.mode === 'scheduled' ? 'scheduled' : 'immediate';

  // ---- 予約：設定を保存するだけ（スクレイピングは走らせない） ----
  if (mode === 'scheduled') {
    const everyWeeks = clampInt(body.everyWeeks, 1, 4, 4);
    const dayOfWeek = clampInt(body.dayOfWeek, 0, 6, 0);
    const atTime = normalizeTime(body.atTime, type === 'phone' ? '04:00' : '03:00');
    await setSchedule(type, { everyWeeks, dayOfWeek, atTime });

    const label = type === 'phone' ? '電話番号' : 'ガチャ';
    const msg =
      `[予約設定を保存しました]\n` +
      `  対象   : ${label}\n` +
      `  頻度   : ${everyWeeks}週間ごと\n` +
      `  実行日 : 毎週${DAY_LABELS[dayOfWeek]}曜日\n` +
      `  時刻   : ${atTime}\n\n` +
      `※ 稼働中のワーカーには自動で即時反映されます（ワーカー未起動時は次回起動時に適用）。\n`;
    return new Response(msg, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // ---- 即時実行：子プロセスを起動し stdout をストリーム返却 ----
  if (running) {
    return new Response('別のスクレイピングが実行中です。完了までお待ちください。\n', {
      status: 409,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  running = true;

  const script = type === 'phone' ? 'scrape:phone' : 'scrape:gacha';
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enqueue = (text: string) => {
        try { controller.enqueue(encoder.encode(text)); } catch { /* closed */ }
      };

      const child = spawn('npm', ['run', script], {
        cwd: process.cwd(),
        shell: true,
        env: process.env,
      });

      // 行バッファリングして prisma のクエリログ(prisma: 〜)を除去し、
      // スクレイパー本来のログだけを流す。
      let lineBuf = '';
      const isNoise = (line: string) => /^\s*prisma:/.test(line);
      const onChunk = (buf: Buffer) => {
        lineBuf += buf.toString();
        const idx = lineBuf.lastIndexOf('\n');
        if (idx === -1) return;
        const complete = lineBuf.slice(0, idx);
        lineBuf = lineBuf.slice(idx + 1);
        const kept = complete.split('\n').filter((l) => !isNoise(l));
        if (kept.length) enqueue(kept.join('\n') + '\n');
      };
      child.stdout.on('data', onChunk);
      child.stderr.on('data', onChunk);

      child.on('error', (err: Error) => {
        enqueue(`\n[起動エラー] ${err.message}\n`);
        running = false;
        try { controller.close(); } catch { /* noop */ }
      });

      child.on('close', (code: number | null) => {
        // 残りの未出力行をフラッシュ（prisma 行は除く）
        if (lineBuf && !isNoise(lineBuf)) enqueue(lineBuf + '\n');
        lineBuf = '';
        // 正常終了(0)は何も足さない。異常終了時のみ通知。
        if (code !== 0) enqueue(`\n[異常終了] exit code = ${code}\n`);
        running = false;
        try { controller.close(); } catch { /* noop */ }
      });
    },
    // クライアントが切断してもスクレイピングは停止しない（原則停止不可）。
    // running は子プロセスの close で解除される。
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
