import passwordResetComplete from './assets/password-reset-complete.svg';

export function PasswordResetCompleteIllustration({
  width = 220,
  className = '',
}: {
  width?: number;
  className?: string;
}) {
  const height = Math.round(width * (passwordResetComplete.height / passwordResetComplete.width));
  return (
    <img
      src={passwordResetComplete.src}
      alt=""
      width={width}
      height={height}
      aria-hidden
      className={`mx-auto block h-auto ${className}`}
      style={{ objectFit: 'contain' }}
    />
  );
}
