import { Noto_Sans_JP, Zen_Maru_Gothic } from 'next/font/google';

const loginDisplayFont = Zen_Maru_Gothic({
  weight: ['700', '900'],
  variable: '--font-login-display',
  display: 'swap',
});

const splashDisplayFont = Noto_Sans_JP({
  weight: ['900'],
  variable: '--font-splash-display',
  display: 'swap',
});

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${loginDisplayFont.className} ${loginDisplayFont.variable} ${splashDisplayFont.variable} min-h-screen h-full`}
    >
      {children}
    </div>
  );
}
