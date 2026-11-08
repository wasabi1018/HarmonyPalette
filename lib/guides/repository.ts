import "server-only";
import { getSupabaseAdminClient, getSupabaseReadClient } from "@/lib/supabase/server";
import { guideEventFor, parseGuideConfiguration, type GuideCategory, type GuideEvent, type GuideArticle, type GuideManagementData } from "./model";

const setupError = "攻略ガイドのマイグレーションとSupabase接続設定を確認してください。";
function admin() {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error(setupError);
  return client;
}
export async function getGuideSettings(strict = false) {
  const client = strict ? admin() : getSupabaseReadClient();
  if (client) {
    const { data, error } = await client.from("guide_settings").select("preparing,updated_at").eq("id", true).maybeSingle();
    if (!error && data) return { preparing: data.preparing !== false, updatedAt: String(data.updated_at) };
    if (strict) throw new Error(setupError);
  }
  return { preparing: true, updatedAt: null };
}
export async function listGuideCategories(strict = false): Promise<GuideCategory[]> {
  const client = strict ? admin() : getSupabaseReadClient();
  if (!client) return [];
  const { data, error } = await client.from("guide_categories").select("id,name,display_order").order("display_order").order("id");
  if (error) throw new Error(setupError);
  return (data ?? []).map((row) => ({ id: String(row.id), name: String(row.name), displayOrder: Number(row.display_order) }));
}
export async function listImportedGuideEvents(): Promise<GuideEvent[]> {
  const client = admin();
  const events = new Map<string, GuideEvent>();
  for (let start = 0; ; start += 1000) {
    const { data, error } = await client.from("schedule_items")
      .select("id,title,source_id,schedule_type,location,kind").not("source_id", "is", null).order("id").range(start, start + 999);
    if (error) throw new Error("取り込みイベントを取得できませんでした。");
    for (const row of data ?? []) {
      const event = guideEventFor({ title: String(row.title), sourceId: String(row.source_id), scheduleType: String(row.schedule_type ?? ""), location: String(row.location ?? ""), kind: String(row.kind) });
      if (event) events.set(event.key, event);
    }
    if ((data?.length ?? 0) < 1000) break;
  }
  return [...events.values()].sort((a, b) => a.name.localeCompare(b.name, "ja"));
}
export async function getGuideEditorOptions() {
  const [categories, events, articles] = await Promise.all([listGuideCategories(true), listImportedGuideEvents(), listGuideArticles(true)]);
  return { categories, events, existingGuides: articles.filter((article) => article.eventKey).map((article) => ({ id: article.id, eventKey: article.eventKey! })) };
}
export async function getGuideManagementData(): Promise<GuideManagementData> {
  const [settings, categories, events, guides] = await Promise.all([getGuideSettings(true), listGuideCategories(true), listImportedGuideEvents(), listGuideArticles(true)]);
  return { ...settings, categories, events, guides, articles: guides.map(({ id, categoryId, displayOrder }) => ({ id, categoryId, displayOrder })) };
}
export async function saveGuideConfiguration(value: unknown) {
  const configuration = parseGuideConfiguration(value);
  const { error } = await admin().rpc("save_guide_configuration", { configuration });
  if (error) throw new Error(error.message.includes("guide_configuration_stale") ? "別の画面で設定が更新されています。再読み込みしてから編集してください。" : "設定を保存できませんでした。再読み込みして内容を確認してください。");
}
async function listGuideArticles(adminMode = false): Promise<GuideArticle[]> {
  const client = adminMode ? admin() : getSupabaseReadClient();
  if (!client) return [];
  const all: GuideArticle[] = [];
  for (let start = 0; ; start += 1000) {
    let query = client.from("articles")
      .select("id,title,slug,excerpt,status,guide_event_key,guide_category_id,guide_display_order")
      .eq("is_strategy_guide", true).is("deleted_at", null).order("id").range(start, start + 999);
    if (!adminMode) query = query.eq("status", "published").lte("published_at", new Date().toISOString());
    const { data, error } = await query;
    if (error) throw new Error("攻略ガイドを読み込めませんでした。");
    all.push(...(data ?? []).map((row) => ({ id: String(row.id), title: String(row.title), slug: String(row.slug), excerpt: String(row.excerpt ?? ""), status: row.status as GuideArticle["status"], eventKey: row.guide_event_key as string | null, categoryId: row.guide_category_id as string | null, displayOrder: Number(row.guide_display_order) })));
    if ((data?.length ?? 0) < 1000) break;
  }
  return all;
}
export async function listPublishedGuideArticles() { return listGuideArticles(false); }
