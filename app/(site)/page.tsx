import type { Metadata } from "next";
import { HomeSections } from "@/components/home-sections";
import { defaultInstagramPostUrls } from "@/data/instagram-posts";
import { listPublishedArticles } from "@/lib/articles/repository";
import { getInstagramEmbedSettings } from "@/lib/instagram-settings";

export const metadata: Metadata = {
  title: "ハーモニーランドの「楽しい！」がそろう場所",
  description: "今日会えるキャラクター、グリーティング予定、初めての方向けガイド、最新記事を見つけやすくまとめたHarmony Paletteのトップページです。",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Harmony Palette",
    description: "ハーモニーランドを応援する非公式ファンサイト",
    url: "https://harmony-palette.example",
    sameAs: ["https://www.instagram.com/harmony__palette/"],
  };
  let latestArticles: Awaited<ReturnType<typeof listPublishedArticles>> = [];
  let instagramPostUrls = [...defaultInstagramPostUrls] as [string, string];
  try {
    const [articles, instagramSettings] = await Promise.all([
      listPublishedArticles({
        destination: "articles",
        limit: 3,
      }).catch(() => []),
      getInstagramEmbedSettings().catch(() => ({
        postUrls: [...defaultInstagramPostUrls] as [string, string],
        updatedAt: null,
      })),
    ]);
    latestArticles = articles;
    instagramPostUrls = instagramSettings.postUrls;
  } catch {
    latestArticles = [];
  }
  return <><HomeSections latestArticles={latestArticles} instagramPostUrls={instagramPostUrls} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
}
