import kokosukiHomeLogo from './assets/kokosuki-home-logo.svg';

export function KokosukiHomeLogo({ height = 36 }: { height?: number }) {
  const width = Math.round(height * (kokosukiHomeLogo.width / kokosukiHomeLogo.height));
  return (
    <img
      src={kokosukiHomeLogo.src}
      alt="ココスキ"
      width={width}
      height={height}
      style={{ display: 'block', objectFit: 'contain' }}
    />
  );
}
