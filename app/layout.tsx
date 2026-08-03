import type { Metadata } from "next";
import {
  GOOGLE_ADSENSE_ACCOUNT,
  SITE_NAME,
  SITE_ORGANIZATION_ID,
  SITE_URL,
  SITE_WEBSITE_ID,
  siteUrl,
} from "@/lib/site-config";
import "./globals.css";

const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();

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
    images: [{ url: "/logo-hero.png", width: 2172, height: 724, alt: "Harmony Palette ロゴ" }],
  },
  robots: { index: true, follow: true },
  other: {
    "google-adsense-account": GOOGLE_ADSENSE_ACCOUNT,
  },
  verification: googleSiteVerification
    ? { google: googleSiteVerification }
    : undefined,
};

const websiteStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": SITE_ORGANIZATION_ID,
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: siteUrl("/logo-hero.png"),
        width: 2172,
        height: 724,
      },
    },
    {
      "@type": "WebSite",
      "@id": SITE_WEBSITE_ID,
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: "ja-JP",
      publisher: { "@id": SITE_ORGANIZATION_ID },
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" data-scroll-behavior="smooth">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteStructuredData).replace(/</g, "\\u003c"),
          }}
        />
        {children}
      </body>
    </html>
  );
}
