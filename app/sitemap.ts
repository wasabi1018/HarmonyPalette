import type { MetadataRoute } from "next";
import { listPublishedArticles } from "@/lib/articles/repository";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://harmony-palette.example";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = ["", "/schedule", "/characters", "/events", "/goods", "/guide", "/around", "/articles"];
  const staticRoutes = routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date("2026-07-21"),
  }));
  try {
    const articles = await listPublishedArticles();
    return [
      ...staticRoutes,
      ...articles.map((article) => ({
        url: `${siteUrl}/articles/${article.slug}`,
        lastModified: new Date(article.updatedAt),
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
