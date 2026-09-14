import { loginDisplayFont, splashDisplayFont } from '@/lib/loginFonts';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${loginDisplayFont.variable} ${splashDisplayFont.variable} min-h-screen h-full`}
    >
      {children}
    </div>
  );
}
