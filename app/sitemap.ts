import type { MetadataRoute } from "next";
import { listPublishedArticles } from "@/lib/articles/repository";
import { listPublishedArticleSeries } from "@/lib/articles/series-repository";
import { siteUrl } from "@/lib/site-config";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: siteUrl("/schedule"), changeFrequency: "daily", priority: 0.9 },
    { url: siteUrl("/characters"), changeFrequency: "weekly", priority: 0.8 },
    { url: siteUrl("/about"), changeFrequency: "monthly", priority: 0.5 },
    { url: siteUrl("/privacy"), changeFrequency: "yearly", priority: 0.3 },
    { url: siteUrl("/contact"), changeFrequency: "yearly", priority: 0.3 },
    { url: siteUrl("/terms"), changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const [articles, series] = await Promise.all([
      listPublishedArticles(),
      listPublishedArticleSeries().catch(() => []),
    ]);
    const contentRoutes = [
      articles.some((article) => article.destination === "guide") ? "/guide" : null,
      articles.some((article) => article.destination === "articles") ? "/articles" : null,
    ]
      .filter((route): route is string => Boolean(route))
      .map((route) => ({
        url: siteUrl(route),
        changeFrequency: "daily" as const,
        priority: 0.8,
      }));

    return [
      ...staticRoutes,
      ...contentRoutes,
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
  } catch {
    return staticRoutes;
  }
}
