import dynamic from 'next/dynamic';

// マップはブラウザ専用APIを使うためSSRを無効化し、静的プリレンダリングもスキップ
export const dynamic = 'force-dynamic';

const MapClient = dynamic(() => import('./MapClient'), { ssr: false });

export default function MapPage() {
  return <MapClient />;
}
