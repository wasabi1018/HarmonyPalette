import type { MetadataRoute } from "next";
import { characters } from "@/data/site-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/schedule", "/characters", "/events", "/goods", "/guide", "/around", "/articles"];
  return [...routes.map((route) => ({ url: `https://harmony-palette.example${route}`, lastModified: new Date("2026-07-21") })), ...characters.map((character) => ({ url: `https://harmony-palette.example/characters/${character.slug}`, lastModified: new Date("2026-07-21") }))];
}
