import "server-only";
import { getAdminArticle } from "@/lib/articles/repository";
import { prepareArticleContent } from "@/lib/articles/publishing";
import { articleRakutenHeadings } from "@/lib/articles/rakuten-content";
import { articleIdFromRakutenPlacement, createArticleRakutenDefinition } from "@/lib/rakuten-article";
import { createRakutenPrDisplay, getRakutenPrDefinition } from "@/lib/rakuten-pr";
import { getRakutenPrPlacement } from "@/lib/rakuten-pr-settings";
import { getRakutenPrProducts } from "@/lib/rakuten-pr-data";
import { RakutenSettingsError } from "@/lib/rakuten-settings-input";

export function articleRakutenDefinition(article: { id: string; slug: string; title: string; contentHtml: string }) {
  const prepared = prepareArticleContent(article.contentHtml, article.title);
  return createArticleRakutenDefinition(article, articleRakutenHeadings(prepared.html, prepared.headings));
}

// Called only after admin authorization by the management route.
export async function resolveAdminRakutenPrDefinition(id: string) {
  const articleId = articleIdFromRakutenPlacement(id);
  if (!articleId) return getRakutenPrDefinition(id);
  const article = await getAdminArticle(articleId);
  if (!article) throw new RakutenSettingsError("記事が見つかりません。", 404);
  return articleRakutenDefinition(article);
}

// The public page passes an already-published article; draft/trash lookups are never performed here.
export async function getPublicArticleRakutenPr(article: { id: string; slug: string; title: string; contentHtml: string }) {
  try {
    const definition = articleRakutenDefinition(article);
    const placement = await getRakutenPrPlacement(definition);
    if (!placement.enabled || !definition.beforeHeadings?.some((heading) => heading.id === placement.beforeHeadingId)) return null;
    const { products } = await getRakutenPrProducts([placement]);
    const display = createRakutenPrDisplay(placement, products);
    return display ? { display, beforeHeadingId: placement.beforeHeadingId } : null;
  } catch { return null; }
}
