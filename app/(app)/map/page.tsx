import MapClient from './client';

export default function MapPage() {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
  return <MapClient mapboxToken={mapboxToken} />;
}
