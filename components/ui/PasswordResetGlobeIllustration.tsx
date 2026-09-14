import passwordResetGlobe from './assets/password-reset-globe.svg';

export function PasswordResetGlobeIllustration({ width = 220 }: { width?: number }) {
  const height = Math.round(width * (passwordResetGlobe.height / passwordResetGlobe.width));
  return (
    <img
      src={passwordResetGlobe.src}
      alt=""
      width={width}
      height={height}
      aria-hidden
      className="mx-auto block"
      style={{ objectFit: 'contain' }}
    />
  );
}
