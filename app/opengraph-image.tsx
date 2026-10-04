import { ImageResponse } from 'next/og';

export const alt = 'ココスキ!';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F7F6F3',
        }}
      >
        <div style={{ fontSize: 92, fontWeight: 900, color: '#F2B800' }}>ココスキ!</div>
        <div style={{ marginTop: 28, fontSize: 36, color: '#555555' }}>リアルタイム・ガチャ在庫マップ</div>
      </div>
    ),
    { ...size },
  );
}
