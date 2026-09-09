import kokosugiLogo from './assets/kokosugi-logo.svg';

export function KokosugiLogo({ width = 64 }: { width?: number }) {
  const height = Math.round(width * (kokosugiLogo.height / kokosugiLogo.width));
  return (
    <img
      src={kokosugiLogo.src}
      alt="ココスギ"
      width={width}
      height={height}
      style={{ display: 'block', objectFit: 'contain' }}
    />
  );
}
