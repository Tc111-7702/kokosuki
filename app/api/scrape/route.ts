import { spawn } from 'node:child_process';

// スクレイピング即時実行 API（admin から呼ばれる）。
//  - npm run scrape:gacha / scrape:phone を「mikke 自身の cwd で」子プロセス起動し、
//    stdout/stderr を text/plain でストリーム返却する。
//  - 以前は admin が MIKKE_DIR 越しに子プロセスを起動していたが、別サーバ運用では
//    ファイルシステムにアクセスできない。スクレイパーが在る mikke 側で実行する形にした。
//  - 子プロセス実行なので stdout が隔離され、他リクエストのログを巻き込まない。
//
// 認証: SCRAPE_TRIGGER_TOKEN が設定されていれば Authorization: Bearer で照合する。
//       未設定なら素通し（開発用）。本番では必ず設定すること。

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // スクレイピングは長時間かかるため上限を延長

// 同時実行ガード（このサーバープロセス内で1件のみ）。
let running = false;

export async function POST(req: Request) {
  // ---- 認証（トークンが設定されている場合のみ照合） ----
  const token = process.env.SCRAPE_TRIGGER_TOKEN;
  if (token && req.headers.get('authorization') !== `Bearer ${token}`) {
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

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enqueue = (text: string) => {
        try { controller.enqueue(encoder.encode(text)); } catch { /* closed */ }
      };

      // mikke 自身のディレクトリで実行（スクレイパーは mikke に在る）。
      const child = spawn('npm', ['run', script], {
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
      child.stdout.on('data', onChunk);
      child.stderr.on('data', onChunk);

      child.on('error', (err: Error) => {
        enqueue(`\n[起動エラー] ${err.message}\n`);
        running = false;
        try { controller.close(); } catch { /* noop */ }
      });

      child.on('close', (code: number | null) => {
        if (lineBuf && !isNoise(lineBuf)) enqueue(lineBuf + '\n');
        lineBuf = '';
        if (code !== 0) enqueue(`\n[異常終了] exit code = ${code}\n`);
        running = false;
        try { controller.close(); } catch { /* noop */ }
      });
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
