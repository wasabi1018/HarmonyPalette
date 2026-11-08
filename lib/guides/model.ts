export type GuideAssignment = { eventKey: string | null; categoryId: string | null; displayOrder: number };
export type GuideCategory = { id: string; name: string; displayOrder: number };
export type GuideEvent = { key: string; name: string };
export type GuideEditorOptions = { categories: GuideCategory[]; events: GuideEvent[]; existingGuides: { id: string; eventKey: string }[] };
export type GuideArticle = {
  id: string; title: string; slug: string; excerpt: string;
  status: "draft" | "scheduled" | "published";
  eventKey: string | null; categoryId: string | null; displayOrder: number;
};
export type GuideConfiguration = {
  preparing: boolean; updatedAt: string | null;
  categories: GuideCategory[];
  articles: { id: string; categoryId: string | null; displayOrder: number }[];
};
export type GuideManagementData = GuideConfiguration & { guides: GuideArticle[]; events: GuideEvent[] };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("攻略ガイドの設定形式が正しくありません。");
  return value as Record<string, unknown>;
}
function id(value: unknown): string {
  if (typeof value !== "string" || !UUID.test(value)) throw new Error("IDの形式が正しくありません。");
  return value;
}
function order(value: unknown): number {
  if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 100000) throw new Error("表示順が正しくありません。");
  return Number(value);
}
export function parseGuideAssignment(value: unknown): GuideAssignment | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const input = record(value);
  if (input.eventKey !== null && (typeof input.eventKey !== "string" || !input.eventKey.trim() || input.eventKey.length > 500)) {
    throw new Error("対象イベントを選択するか、自由入力に切り替えてください。");
  }
  return { eventKey: input.eventKey === null ? null : String(input.eventKey).trim(), categoryId: input.categoryId === null ? null : id(input.categoryId), displayOrder: order(input.displayOrder) };
}
export function parseGuideConfiguration(value: unknown): GuideConfiguration {
  const input = record(value);
  if (typeof input.preparing !== "boolean" || !Array.isArray(input.categories) || !Array.isArray(input.articles)) throw new Error("準備中・カテゴリ・記事の設定を確認してください。");
  if (input.categories.length > 200 || input.articles.length > 5000) throw new Error("設定件数が多すぎます。");
  if (typeof input.updatedAt !== "string" || !Number.isFinite(Date.parse(input.updatedAt))) throw new Error("設定を再読み込みしてください。");
  const categories = input.categories.map((value) => {
    const row = record(value);
    if (typeof row.name !== "string" || !row.name.trim() || row.name.trim().length > 80) throw new Error("カテゴリ名を80文字以内で入力してください。");
    return { id: id(row.id), name: row.name.trim(), displayOrder: order(row.displayOrder) };
  });
  const categoryIds = new Set(categories.map((item) => item.id));
  if (categoryIds.size !== categories.length || new Set(categories.map((item) => item.name)).size !== categories.length) throw new Error("カテゴリが重複しています。");
  const articles = input.articles.map((value) => {
    const row = record(value);
    const categoryId = row.categoryId === null ? null : id(row.categoryId);
    if (categoryId && !categoryIds.has(categoryId)) throw new Error("記事のカテゴリを確認してください。");
    return { id: id(row.id), categoryId, displayOrder: order(row.displayOrder) };
  });
  if (new Set(articles.map((item) => item.id)).size !== articles.length) throw new Error("記事が重複しています。");
  return { preparing: input.preparing, updatedAt: input.updatedAt, categories, articles };
}

export type ImportedGuideEvent = { title: string; sourceId: string; scheduleType: string; location: string; kind: string };
export function guideEventFor(entry: ImportedGuideEvent): GuideEvent | null {
  if (!entry.sourceId || !entry.title.trim()) return null;
  if (entry.sourceId === "harmonyland-funstudio" || (entry.kind === "greeting" && /ファンスタジオ/.test(entry.scheduleType + entry.location))) {
    return { key: "harmonyland-funstudio", name: "ファンスタジオ" };
  }
  const normalized = entry.title.normalize("NFKC").replace(/[\s\u3000]+/g, " ").trim().toLocaleLowerCase("ja");
  return { key: `${entry.sourceId}:${normalized}`, name: entry.title.trim() };
}
export function groupGuideArticles(categories: GuideCategory[], articles: GuideArticle[]) {
  const known = new Set(categories.map((item) => item.id));
  const groups = [...categories].sort((a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id))
    .map((category) => ({ ...category, articles: articles.filter((article) => article.categoryId === category.id) }));
  groups.push({ id: "uncategorized", name: "その他の攻略ガイド", displayOrder: 100001, articles: articles.filter((article) => !article.categoryId || !known.has(article.categoryId)) });
  return groups.filter((group) => group.articles.length).map((group) => ({ ...group, articles: group.articles.sort((a, b) => a.displayOrder - b.displayOrder || a.title.localeCompare(b.title, "ja") || a.id.localeCompare(b.id)) }));
}
