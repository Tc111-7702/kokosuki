import kokosugiLogo from './assets/kokosugi-logo.svg';

const ASPECT = 645 / 813;

export function KokosugiLogo({ width = 64 }: { width?: number }) {
  const height = Math.round(width * ASPECT);
  return (
    <img
      src={kokosugiLogo}
      alt="ココスギ"
      width={width}
      height={height}
      style={{ display: 'block', objectFit: 'contain' }}
    />
  );
}
