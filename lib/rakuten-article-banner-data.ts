import "server-only";
import { getAdminArticle } from "@/lib/articles/repository";
import { articleIdFromRakutenBanner, createArticleRakutenBannerDefinition } from "@/lib/rakuten-article";
import { getRakutenBannerDefinition } from "@/lib/rakuten-banner";
import { getRakutenBanner, getPublicRakutenBanner } from "@/lib/rakuten-banner-settings";
import { RakutenSettingsError } from "@/lib/rakuten-settings-input";

export async function resolveAdminRakutenBannerDefinition(id: string) {
  const articleId = articleIdFromRakutenBanner(id);
  if (!articleId) return getRakutenBannerDefinition(id);
  const article = await getAdminArticle(articleId);
  if (!article) throw new RakutenSettingsError("記事が見つかりません。", 404);
  return createArticleRakutenBannerDefinition(article);
}

export async function getPublicArticleRakutenBanner(article: { id: string; slug: string }) {
  try {
    const banner = await getRakutenBanner(createArticleRakutenBannerDefinition(article));
    if (banner.mode === "inherit") return await getPublicRakutenBanner("article-top");
    return banner.enabled ? banner : null;
  } catch { return null; }
}
