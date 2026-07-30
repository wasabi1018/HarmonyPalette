import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | ハーモニーランドの情報サイト`,
    template: `%s | ${SITE_NAME}`,
  },
  description: "ハーモニーランドの今日会えるキャラクター、グリーティング予定、イベント、周辺情報を見つけやすく整理した非公式ファンサイトです。",
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": "/articles/feed.xml",
      "application/feed+json": "/articles/feed.json",
    },
  },
  openGraph: {
    title: "Harmony Palette | ハーモニーランドの情報サイト",
    description: "今日会えるキャラクターから周辺旅行まで、ハーモニーランドをもっと楽しむための情報サイト。",
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "ja_JP",
    type: "website",
    images: [{ url: "/logo.png", width: 1536, height: 1024, alt: "Harmony Palette ロゴ" }],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
