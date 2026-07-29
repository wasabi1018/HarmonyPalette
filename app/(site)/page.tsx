import type { Metadata } from "next";
import { HomeSections } from "@/components/home-sections";
import { listPublishedArticles } from "@/lib/articles/repository";

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
  };
  let latestArticles: Awaited<ReturnType<typeof listPublishedArticles>> = [];
  try {
    latestArticles = await listPublishedArticles({
      destination: "articles",
      limit: 3,
    });
  } catch {
    latestArticles = [];
  }
  return <><HomeSections latestArticles={latestArticles} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
}
