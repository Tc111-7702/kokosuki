import { loginDisplayFont, splashDisplayFont } from '@/lib/loginFonts';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${loginDisplayFont.variable} ${splashDisplayFont.variable} flex min-h-screen h-full w-full min-w-0 flex-col`}
    >
      {children}
    </div>
  );
}
