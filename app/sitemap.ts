import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/schedule", "/characters", "/events", "/goods", "/guide", "/around", "/articles"];
  return routes.map((route) => ({ url: `https://harmony-palette.example${route}`, lastModified: new Date("2026-07-21") }));
}
