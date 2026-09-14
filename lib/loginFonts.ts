import { Noto_Sans_JP, Zen_Maru_Gothic } from 'next/font/google';

export const loginDisplayFont = Zen_Maru_Gothic({
  weight: ['700', '900'],
  variable: '--font-login-display',
  display: 'swap',
});

export const splashDisplayFont = Noto_Sans_JP({
  weight: ['900'],
  variable: '--font-splash-display',
  display: 'swap',
});
