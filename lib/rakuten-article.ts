import type { RakutenPrPlacement, RakutenPrPlacementDefinition } from "@/lib/rakuten-pr";
import { RakutenSettingsError } from "@/lib/rakuten-settings-input";
import type { RakutenBannerDefinition } from "@/lib/rakuten-banner";

export const ARTICLE_RAKUTEN_PREFIX = "article-inline-";
export const ARTICLE_BANNER_PREFIX = "article-banner-";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function articleIdFromRakutenPlacement(id: string) {
  return articleIdFromPlacement(id, ARTICLE_RAKUTEN_PREFIX);
}
function articleIdFromPlacement(id: string, prefix: string) {
  const articleId = id.startsWith(prefix) ? id.slice(prefix.length) : "";
  return UUID.test(articleId) ? articleId.toLowerCase() : null;
}
export function articleIdFromRakutenBanner(id: string) { return articleIdFromPlacement(id, ARTICLE_BANNER_PREFIX); }

export function createArticleRakutenBannerDefinition(article: { id: string; slug: string }): RakutenBannerDefinition {
  if (!UUID.test(article.id)) throw new RakutenSettingsError("記事が見つかりません。", 404);
  return { id: `${ARTICLE_BANNER_PREFIX}${article.id.toLowerCase()}`, label: "この記事の上部バナー", location: "目次の後・本文の前（目次がない記事は本文の前）", revalidatePaths: [`/articles/${article.slug}`], allowInheritance: true };
}

export function createArticleRakutenDefinition(article: { id: string; slug: string }, headings: readonly { id: string; text: string }[]): RakutenPrPlacementDefinition {
  if (!UUID.test(article.id)) throw new RakutenSettingsError("記事が見つかりません。", 404);
  return {
    id: `${ARTICLE_RAKUTEN_PREFIX}${article.id.toLowerCase()}`, label: "この記事の本文途中（2件）",
    location: "選んだ見出しの手前", itemLimit: 2, beforeHeadings: headings,
    revalidatePaths: [`/articles/${article.slug}`, `/admin/articles/${article.id}`],
  };
}

export function validateArticleRakutenPosition(placement: RakutenPrPlacement, definition: RakutenPrPlacementDefinition) {
  if (definition.beforeHeadings && placement.enabled && !definition.beforeHeadings.some((heading) => heading.id === placement.beforeHeadingId)) {
    throw new RakutenSettingsError("公開するには、保存済みの本文から挿入する見出しを選んでください。");
  }
}
