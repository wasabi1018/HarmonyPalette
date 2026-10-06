import type { Metadata } from "next";
import { HomeSections } from "@/components/home-sections";
import { SiteEventTracker } from "@/components/site-event-tracker";
import { defaultInstagramPostUrls } from "@/data/instagram-posts";
import { listPublishedArticles } from "@/lib/articles/repository";
import { getInstagramEmbedSettings } from "@/lib/instagram-settings";
import { getHomepageSettings } from "@/lib/homepage-settings";
import { createDefaultHomepageGuideCards } from "@/lib/homepage-guide-cards";
import { getPublicRakutenPrPlacement } from "@/lib/rakuten-pr-data";
import type { RakutenPrDisplay } from "@/lib/rakuten-pr";
import { getPublicRakutenBanner } from "@/lib/rakuten-banner-settings";
import type { RakutenBannerPlacement } from "@/lib/rakuten-banner";
import { INSTAGRAM_URL, SITE_NAME, SITE_URL } from "@/lib/site-config";
import { getInitialCharacterData, getInitialParkOperatingDayData, getInitialScheduleData } from "@/lib/supabase/initial-data";

export const metadata: Metadata = {
  title: "ハーモニーランドの「楽しい！」がそろう場所",
  description: "今日会えるキャラクター、グリーティング予定、初めての方向けガイド、最新記事を見つけやすくまとめたHarmony Paletteのトップページです。",
};

export const revalidate = 300;

export default async function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    description: "ハーモニーランドを応援する非公式ファンサイト",
    url: SITE_URL,
    sameAs: [INSTAGRAM_URL],
  };
  let latestArticles: Awaited<ReturnType<typeof listPublishedArticles>> = [];
  let instagramPostUrls = [...defaultInstagramPostUrls] as [string, string];
  let guideCards = createDefaultHomepageGuideCards();
  let rakutenPr: RakutenPrDisplay | null = null;
  let rakutenBanner: RakutenBannerPlacement | null = null;
  const initialDataPromise = Promise.all([
    getInitialScheduleData(),
    getInitialCharacterData(),
    getInitialParkOperatingDayData(),
  ]);
  try {
    const [articles, instagramSettings, homepageSettings, pickup, banner] = await Promise.all([
      listPublishedArticles({
        limit: 2,
      }).catch(() => []),
      getInstagramEmbedSettings().catch(() => ({
        postUrls: [...defaultInstagramPostUrls] as [string, string],
        updatedAt: null,
      })),
      getHomepageSettings().catch(() => ({ guideCards: createDefaultHomepageGuideCards(), updatedAt: null })),
      getPublicRakutenPrPlacement("home-pickup"),
      getPublicRakutenBanner("home-between-articles-birthday"),
    ]);
    latestArticles = articles;
    instagramPostUrls = instagramSettings.postUrls;
    guideCards = homepageSettings.guideCards;
    rakutenPr = pickup;
    rakutenBanner = banner;
  } catch {
    latestArticles = [];
  }
  const [initialScheduleData, initialCharacterData, initialOperatingDayData] = await initialDataPromise;
  return <><SiteEventTracker eventName="home_view" sessionKey="home-view" /><HomeSections latestArticles={latestArticles} instagramPostUrls={instagramPostUrls} guideCards={guideCards} initialScheduleData={initialScheduleData} initialCharacterData={initialCharacterData} initialOperatingDayData={initialOperatingDayData} rakutenPr={rakutenPr} rakutenBanner={rakutenBanner} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
}
