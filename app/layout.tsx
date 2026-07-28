import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://harmony-palette.example";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Harmony Palette | ハーモニーランドの情報サイト",
    template: "%s | Harmony Palette",
  },
  description: "ハーモニーランドの今日会えるキャラクター、グリーティング予定、イベント、周辺情報を見つけやすく整理した非公式ファンサイトです。",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Harmony Palette | ハーモニーランドの情報サイト",
    description: "今日会えるキャラクターから周辺旅行まで、ハーモニーランドをもっと楽しむための情報サイト。",
    url: siteUrl,
    siteName: "Harmony Palette",
    locale: "ja_JP",
    type: "website",
    images: [{ url: "/logo.png", width: 1536, height: 1024, alt: "Harmony Palette ロゴ" }],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
