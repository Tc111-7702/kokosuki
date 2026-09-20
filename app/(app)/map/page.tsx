import MapLoader from './loader';
import { NavActiveSetter } from '@/components/NavActiveSetter';

// 静的プリレンダリングを無効化（マップはブラウザ専用API使用のため）
export const dynamic = 'force-dynamic';

export default function MapPage() {
  return (
    <>
      <NavActiveSetter section="map" />
      <MapLoader />
    </>
  );
}
