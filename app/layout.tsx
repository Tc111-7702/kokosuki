import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppThemeProvider } from "@/components/AppThemeProvider";
import "./globals.css";
import "./kokosuki-app-theme.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.kokosuki.app';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "ココスキ!",
  description: "リアルタイム・ガチャ在庫マップ",
  applicationName: "ココスキ!",
  manifest: "/manifest.json",
  openGraph: {
    title: "ココスキ!",
    description: "リアルタイム・ガチャ在庫マップ",
    siteName: "ココスキ!",
    locale: "ja_JP",
    type: "website",
    url: appUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "ココスキ!",
    description: "リアルタイム・ガチャ在庫マップ",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('kokosuki-theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`,
          }}
        />
      </head>
      <body className="h-full overflow-hidden" data-kokosuki-app>
        <AppThemeProvider>{children}</AppThemeProvider>
      </body>
    </html>
  );
}
