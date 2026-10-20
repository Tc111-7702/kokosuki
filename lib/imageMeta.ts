/**
 * 画像からメタデータを除去するユーティリティ（撮影位置=GPS 等の流出防止）。
 *
 * ネイティブ依存(sharp/libvips)は Vercel/Turbopack でのデプロイが不安定なため使わず、
 * JPEG の APPn/COM セグメントを取り除くだけの純JS実装にしている。再エンコードしないのでロスレス。
 * スマホ写真(JPEG)の GPS/EXIF/XMP を落とすのが主目的。JPEG 以外・不正データは元のまま返す。
 */
export function stripJpegMetadata(buf: Buffer): Buffer {
  // SOI (FF D8) が無ければ JPEG ではない → そのまま返す
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return buf;

  const parts: Buffer[] = [buf.subarray(0, 2)]; // SOI
  let i = 2;

  while (i + 1 < buf.length) {
    // マーカーは必ず FF xx で始まる。崩れていたら安全側で残りをそのままコピーして終了。
    if (buf[i] !== 0xff) {
      parts.push(buf.subarray(i));
      return Buffer.concat(parts);
    }
    const marker = buf[i + 1];

    // SOS(FF DA) 以降は圧縮データ、EOI(FF D9) は終端 → 残りを丸ごとコピーして終了
    if (marker === 0xda || marker === 0xd9) {
      parts.push(buf.subarray(i));
      return Buffer.concat(parts);
    }

    // 長さ付きセグメント（FF xx + 2byte length）。読めない/壊れている場合はそのまま返す。
    if (i + 3 >= buf.length) {
      parts.push(buf.subarray(i));
      return Buffer.concat(parts);
    }
    const len = buf.readUInt16BE(i + 2); // length は自身の2byteを含む
    const end = i + 2 + len;
    if (end > buf.length) {
      parts.push(buf.subarray(i));
      return Buffer.concat(parts);
    }

    // APP1..APP15 (0xE1-0xEF: EXIF=E1, XMP=E1, ICC=E2 等) と COM(0xFE) を破棄。
    // APP0(0xE0: JFIF) は基本情報なので残す。これで GPS/EXIF/XMP が除去される。
    const drop = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
    if (!drop) parts.push(buf.subarray(i, end));
    i = end;
  }

  return Buffer.concat(parts);
}
