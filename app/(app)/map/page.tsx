import MapLoader from './loader';

// 静的プリレンダリングを無効化（マップはブラウザ専用API使用のため）
export const dynamic = 'force-dynamic';

export default function MapPage() {
  return <MapLoader />;
}
