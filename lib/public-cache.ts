import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";

export const PUBLIC_CACHE_REVALIDATE_SECONDS = 300;
export const PUBLIC_DAILY_CACHE_REVALIDATE_SECONDS = 86_400;
export const PUBLIC_ARTICLE_CACHE_REVALIDATE_SECONDS = 86_400;

export const PUBLIC_CACHE_TAGS = {
  schedules: "public-schedules",
  operatingDays: "public-operating-days",
  characters: "public-characters",
  planOptions: "public-plan-options",
  articles: "public-articles",
  crowdForecast: "public-crowd-forecast",
} as const;

function revalidatePaths(paths: string[]) {
  paths.forEach((path) => revalidatePath(path));
}

export function revalidatePublicScheduleData() {
  revalidateTag(PUBLIC_CACHE_TAGS.schedules);
  revalidateTag(PUBLIC_CACHE_TAGS.operatingDays);
  revalidateTag(PUBLIC_CACHE_TAGS.characters);
  revalidatePaths(["/", "/schedule", "/plan", "/characters"]);
}

export function revalidatePublicCharacterData() {
  revalidateTag(PUBLIC_CACHE_TAGS.characters);
  revalidateTag(PUBLIC_CACHE_TAGS.schedules);
  revalidatePaths(["/", "/schedule", "/plan", "/characters"]);
}

export function revalidatePublicPlanOptions() {
  revalidateTag(PUBLIC_CACHE_TAGS.planOptions);
  revalidatePath("/plan");
}

export function revalidatePublicCrowdForecastData() {
  revalidateTag(PUBLIC_CACHE_TAGS.crowdForecast);
  revalidatePaths(["/crowd-forecast", "/api/crowd-forecast"]);
}

export function revalidatePublicArticleData(slug?: string) {
  revalidateTag(PUBLIC_CACHE_TAGS.articles);
  revalidatePaths(["/", "/articles", "/guides", "/api/guides", "/articles/feed.xml", "/articles/feed.json", "/sitemap.xml"]);
  if (slug) revalidatePath(`/articles/${slug}`);
}
