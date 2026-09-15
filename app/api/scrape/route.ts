import { spawn, type ChildProcess } from 'node:child_process';
import {
  getKokosukiApiToken,
  hasValidKokosukiApiToken,
  isKokosukiApiTokenDevBypass,
  isKokosukiApiTokenRequired,
} from '@/lib/kokosukiApiAuth';

// スクレイピング即時実行 API（admin から呼ばれる）。
//  - npm run scrape:gacha / scrape:phone を「mikke 自身の cwd で」子プロセス起動し、
//    stdout/stderr を text/plain でストリーム返却する。
//  - 以前は admin が MIKKE_DIR 越しに子プロセスを起動していたが、別サーバ運用では
//    ファイルシステムにアクセスできない。スクレイパーが在る mikke 側で実行する形にした。
//  - 子プロセス実行なので stdout が隔離され、他リクエストのログを巻き込まない。
//  - shop-sync 中など可視ログが無出力になる区間があるため、一定間隔で不可視ハートビートを
//    送り、接続のアイドルタイムアウト（fetch/プロキシ）で切れないようにする。
//
// 認証: KOKOSUKI_API_TOKEN が設定されていれば Authorization: Bearer で照合する。
//       未設定なら素通し（開発用）。本番では必ず設定すること（proxy でも検証）。

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // スクレイピングは長時間かかるため上限を延長

// 無出力が続いたときにハートビートを送る間隔（ms）。
const HEARTBEAT_MS = 20_000;
// 不可視ハートビート文字（NUL = U+0000）。実ログには現れないため、クライアント側で確実に除去できる。
const HEARTBEAT_CHAR = String.fromCharCode(0);

// 同時実行ガード（このサーバープロセス内で1件のみ）。
let running = false;

export async function POST(req: Request) {
  // ---- 認証（トークンが設定されている場合のみ照合） ----
  if (isKokosukiApiTokenRequired() && !getKokosukiApiToken()) {
    return new Response('KOKOSUKI_API_TOKEN is not configured\n', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  if (!isKokosukiApiTokenDevBypass() && !hasValidKokosukiApiToken(req)) {
    return new Response('Unauthorized\n', {
      status: 401,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const body = (await req.json().catch(() => ({}))) as { type?: string };
  const type: 'gacha' | 'phone' = body.type === 'phone' ? 'phone' : 'gacha';

  if (running) {
    return new Response('別のスクレイピングが実行中です。完了までお待ちください。\n', {
      status: 409,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  running = true;

  const script = type === 'phone' ? 'scrape:phone' : 'scrape:gacha';
  const encoder = new TextEncoder();

  // start / cancel の双方から触るため外側で保持。
  let child: ChildProcess | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let lastSent = Date.now();
      const enqueue = (text: string) => {
        try {
          controller.enqueue(encoder.encode(text));
          lastSent = Date.now();
        } catch { /* closed */ }
      };

      // mikke 自身のディレクトリで実行（スクレイパーは mikke に在る）。
      child = spawn('npm', ['run', script], {
        cwd: process.cwd(),
        shell: true,
        env: process.env,
      });

      // 行バッファリングして prisma のクエリログを除去し、スクレイパーのログだけを流す。
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
      child.stdout?.on('data', onChunk);
      child.stderr?.on('data', onChunk);

      // 無出力が HEARTBEAT_MS 続いたら不可視のハートビート(NUL)を流して接続を維持する。
      // 1文字でも受信すればアイドルタイマーがリセットされる。画面にはクライアント側で除去され出ない。
      heartbeat = setInterval(() => {
        if (Date.now() - lastSent >= HEARTBEAT_MS) enqueue(HEARTBEAT_CHAR);
      }, HEARTBEAT_MS);

      child.on('error', (err: Error) => {
        if (heartbeat) clearInterval(heartbeat);
        enqueue(`\n[起動エラー] ${err.message}\n`);
        running = false;
        try { controller.close(); } catch { /* noop */ }
      });

      child.on('close', (code: number | null) => {
        if (heartbeat) clearInterval(heartbeat);
        if (lineBuf && !isNoise(lineBuf)) enqueue(lineBuf + '\n');
        lineBuf = '';
        if (code !== 0) enqueue(`\n[異常終了] exit code = ${code}\n`);
        running = false;
        try { controller.close(); } catch { /* noop */ }
      });
    },

    // クライアント切断時。ハートビートは止めるが、スクレイプ本体は完走させる
    // （途中終了で中途半端な状態を作らないため。完了時に close ハンドラで running が解除される）。
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
