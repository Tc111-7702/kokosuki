import kokosukiLogo from './assets/kokosuki-logo.svg';

export function KokosukiLogo({ width = 64 }: { width?: number }) {
  const height = Math.round(width * (kokosukiLogo.height / kokosukiLogo.width));
  return (
    <img
      src={kokosukiLogo.src}
      alt="ココスキ"
      width={width}
      height={height}
      style={{ display: 'block', objectFit: 'contain' }}
    />
  );
}
