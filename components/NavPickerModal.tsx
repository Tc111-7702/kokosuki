'use client';

// ─── 経路アプリ選択モーダル ────────────────────────────────────────────────────
// store/page.tsx と SpotDetailSheet.tsx の両方から使う共通コンポーネント

interface NavPickerModalProps {
  lat: number;
  lng: number;
  name: string;
  currentPos: { lat: number; lng: number } | null;
  onClose: () => void;
}

export default function NavPickerModal({ lat, lng, name, currentPos, onClose }: NavPickerModalProps) {
  const dst = `${lat},${lng}`;
  const src = currentPos ? `${currentPos.lat},${currentPos.lng}` : '';

  const apps = [
    {
      name: 'Google マップ',
      url: src
        ? `https://www.google.com/maps/dir/?api=1&origin=${src}&destination=${dst}&travelmode=walking`
        : `https://www.google.com/maps/dir/?api=1&destination=${dst}&travelmode=walking`,
    },
    { name: 'Yahoo! カーナビ', url: `https://map.yahoo.co.jp/route/walk?from=${src}&to=${dst}` },
    { name: 'Apple マップ', url: `https://maps.apple.com/?daddr=${dst}${src ? `&saddr=${src}` : ''}&dirflg=w` },
  ];

  return (
    <>
      <div className="fixed inset-0 z-[60]" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[70] flex flex-col"
        style={{ background: 'white', borderRadius: '20px 20px 0 0', boxShadow: '0 -4px 24px rgba(0,0,0,0.2)' }}>
        <div className="flex justify-center pt-3 pb-1">
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E0E0E0' }} />
        </div>
        <div className="px-4 pt-2 pb-1">
          <p className="text-[15px] font-black" style={{ color: '#1a1a1a' }}>経路アプリを選択</p>
          <p className="text-[12px] mt-0.5" style={{ color: '#aaa' }}>{name}</p>
        </div>
        <div className="flex flex-col gap-2 px-4 py-3">
          {apps.map(app => (
            <a key={app.name} href={app.url} target="_blank" rel="noopener noreferrer"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{ background: '#F5F3ED', textDecoration: 'none' }}>
              <span className="text-[15px] font-bold" style={{ color: '#1a1a1a' }}>{app.name}</span>
            </a>
          ))}
        </div>
        <div className="px-4 pb-8 pt-1">
          <button onClick={onClose} className="w-full py-3 rounded-2xl text-[14px] font-bold"
            style={{ background: '#F0F0F0', color: '#888' }}>
            キャンセル
          </button>
        </div>
      </div>
    </>
  );
}
