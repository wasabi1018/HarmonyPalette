import type { Metadata } from "next";
import { HomeSections } from "@/components/home-sections";

export const metadata: Metadata = {
  title: "ハーモニーランドの「楽しい！」がそろう場所",
  description: "今日会えるキャラクター、グリーティング予定、イベント、周辺情報を見つけやすくまとめたHarmony Paletteのトップページです。",
};

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Harmony Palette",
    description: "ハーモニーランドを応援する非公式ファンサイト",
    url: "https://harmony-palette.example",
  };
  return <><HomeSections /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
}
