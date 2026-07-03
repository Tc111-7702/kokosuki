'use client';
import dynamic from 'next/dynamic';

// ssr: false はClientコンポーネント内でのみ使用可能
const MapClient = dynamic(() => import('./MapClient'), { ssr: false });

export default function MapLoader() {
  return <MapClient />;
}
