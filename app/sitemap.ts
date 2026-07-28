import type { MetadataRoute } from "next";
import { listPublishedArticles } from "@/lib/articles/repository";
import { listPublishedArticleSeries } from "@/lib/articles/series-repository";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://harmony-palette.example";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = ["", "/schedule", "/characters", "/events", "/goods", "/guide", "/around", "/articles"];
  const staticRoutes = routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date("2026-07-21"),
  }));
  try {
    const [articles, series] = await Promise.all([
      listPublishedArticles(),
      listPublishedArticleSeries().catch(() => []),
    ]);
    return [
      ...staticRoutes,
      ...articles.map((article) => ({
        url: `${siteUrl}/articles/${article.slug}`,
        lastModified: new Date(article.updatedAt),
      })),
      ...series.map((item) => ({
        url: `${siteUrl}/articles/series/${item.slug}`,
        lastModified: new Date(item.updatedAt),
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
