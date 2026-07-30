import type { MetadataRoute } from "next";
import { listPublishedArticles } from "@/lib/articles/repository";
import { listPublishedArticleSeries } from "@/lib/articles/series-repository";
import { SITE_URL } from "@/lib/site-config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const alwaysPublishedRoutes = [
    "",
    "/schedule",
    "/characters",
    "/about",
    "/privacy",
    "/contact",
    "/terms",
  ];
  const staticRoutes = alwaysPublishedRoutes.map((route) => ({
    url: `${SITE_URL}${route}`,
  }));
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
      .map((route) => ({ url: `${SITE_URL}${route}` }));
    return [
      ...staticRoutes,
      ...contentRoutes,
      ...articles.map((article) => ({
        url: `${SITE_URL}/articles/${article.slug}`,
        lastModified: new Date(article.updatedAt),
      })),
      ...series.map((item) => ({
        url: `${SITE_URL}/articles/series/${item.slug}`,
        lastModified: new Date(item.updatedAt),
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
