export type ArticleTravel = { disclosure: string; spotIds: string[]; showHotelGuide?: boolean };

export const EMPTY_ARTICLE_TRAVEL: ArticleTravel = {
  disclosure: "",
  spotIds: [],
};

export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function str(v: unknown, max: number, required = false) {
  if (typeof v !== "string" || v.length > max || (required && !v.trim()))
    throw new Error("入力内容・文字数を確認してください。");
  return v.trim();
}

export function parseArticleTravel(value: unknown): ArticleTravel {
  if (!value || typeof value !== "object")
    throw new Error("記事と施設の関連情報が正しくありません。");
  const v = value as Record<string, unknown>;
  if (Object.hasOwn(v, "showHotelGuide") && typeof v.showHotelGuide !== "boolean") throw new Error("ホテル案内の表示設定が正しくありません。");
  if (
    !Array.isArray(v.spotIds) ||
    v.spotIds.length > 20 ||
    v.spotIds.some((id) => typeof id !== "string" || !UUID.test(id))
  )
    throw new Error("施設IDが正しくありません。");
  return {
    disclosure: str(v.disclosure, 1000),
    spotIds: [...new Set(v.spotIds as string[])],
    ...(Object.hasOwn(v, "showHotelGuide") ? { showHotelGuide: v.showHotelGuide === true } : {}),
  };
}
