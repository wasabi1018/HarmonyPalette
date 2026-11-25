import { getPublicHotelCatalog } from "@/lib/hotels/repository";
import { canIndexHotel } from "@/lib/hotels/model";
import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { listPublishedArticles } from "@/lib/articles/repository";
import { listPublishedArticleSeries } from "@/lib/articles/series-repository";
import { getGuideSettings } from "@/lib/guides/repository";
import {
  PUBLIC_ARTICLE_CACHE_REVALIDATE_SECONDS,
  PUBLIC_CACHE_TAGS,
} from "@/lib/public-cache";
import { siteUrl } from "@/lib/site-config";

export const revalidate = 86_400;

const loadSitemapContent = unstable_cache(
  () => Promise.all([
    listPublishedArticles({ includeGuides: true }),
    listPublishedArticleSeries(),
    getGuideSettings(),
  ]),
  ["public-sitemap-content-v2"],
  {
    revalidate: PUBLIC_ARTICLE_CACHE_REVALIDATE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.articles],
  },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: siteUrl("/schedule"), changeFrequency: "daily", priority: 0.9 },
    { url: siteUrl("/daily-schedule"), changeFrequency: "daily", priority: 0.9 },
    { url: siteUrl("/crowd-forecast"), changeFrequency: "daily", priority: 0.8 },
    { url: siteUrl("/characters"), changeFrequency: "weekly", priority: 0.8 },
    { url: siteUrl("/about"), changeFrequency: "monthly", priority: 0.5 },
    { url: siteUrl("/privacy"), changeFrequency: "yearly", priority: 0.3 },
    { url: siteUrl("/data-deletion"), changeFrequency: "yearly", priority: 0.3 },
    { url: siteUrl("/contact"), changeFrequency: "yearly", priority: 0.3 },
    { url: siteUrl("/terms"), changeFrequency: "yearly", priority: 0.3 },
  ];

  const [[articles, series, guideSettings], hotelCatalog] = await Promise.all([loadSitemapContent(), getPublicHotelCatalog()]);
  const contentRoutes = articles.length > 0 ? [{
    url: siteUrl("/articles"),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }] : [];

  return [
    ...staticRoutes,
    ...contentRoutes,
    ...(!guideSettings.preparing && articles.some((article) => article.guide) ? [{ url: siteUrl("/guides"), changeFrequency: "weekly" as const, priority: 0.8 }] : []),
    ...(hotelCatalog.hotels.length ? [{ url: siteUrl("/hotels"), changeFrequency: "weekly" as const, priority: 0.8 }] : []),
    ...hotelCatalog.hotels.filter(h => h.allowIndex && canIndexHotel(h)).map(h => ({ url: siteUrl(`/hotels/${h.slug}`), lastModified: new Date(h.updatedAt), changeFrequency: "weekly" as const, priority: 0.7 })),
    ...articles.map((article) => ({
      url: siteUrl(`/articles/${article.slug}`),
      lastModified: new Date(article.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...series.map((item) => ({
      url: siteUrl(`/articles/series/${item.slug}`),
      lastModified: new Date(item.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
