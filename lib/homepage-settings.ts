import "server-only";

import { createDefaultHomepageGuideCards, normalizeHomepageGuideCards, type HomepageGuideCard } from "@/lib/homepage-guide-cards";
import { getSupabaseAdminClient, getSupabaseReadClient } from "@/lib/supabase/server";

const SETTINGS_BUCKET = "site-settings";
const SETTINGS_PATH = "homepage/guide-cards.json";

export type HomepageSettings = { guideCards: HomepageGuideCard[]; updatedAt: string | null };

export async function getHomepageSettings(): Promise<HomepageSettings> {
  const defaults = { guideCards: createDefaultHomepageGuideCards(), updatedAt: null };
  const client = getSupabaseAdminClient() || getSupabaseReadClient();
  if (!client) return defaults;
  const { data, error } = await client.storage.from(SETTINGS_BUCKET).download(SETTINGS_PATH);
  if (error) {
    if (/not found|not exist/i.test(error.message)) return defaults;
    throw new Error("TOPページ設定を取得できませんでした。時間をおいて再読み込みしてください。");
  }
  if (!data) return defaults;
  try {
    const value = JSON.parse(await data.text()) as { guideCards?: unknown; updatedAt?: unknown };
    return {
      guideCards: normalizeHomepageGuideCards(value.guideCards),
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null,
    };
  } catch {
    throw new Error("保存済みのTOPページ設定を読み込めませんでした。");
  }
}

export async function updateHomepageSettings(values: unknown): Promise<HomepageSettings> {
  const guideCards = normalizeHomepageGuideCards(values);
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabaseのサーバー用秘密鍵が設定されていません。");
  const { data: bucket, error: bucketError } = await client.storage.getBucket(SETTINGS_BUCKET);
  if (!bucket) {
    if (bucketError && !/not found|not exist/i.test(bucketError.message)) throw new Error("設定の保存先を確認できませんでした。");
    const { error } = await client.storage.createBucket(SETTINGS_BUCKET, {
      public: false, fileSizeLimit: 10240, allowedMimeTypes: ["application/json"],
    });
    if (error && !/already exists|duplicate/i.test(error.message)) throw new Error(error.message);
  }
  const settings: HomepageSettings = { guideCards, updatedAt: new Date().toISOString() };
  const { error } = await client.storage.from(SETTINGS_BUCKET).upload(SETTINGS_PATH,
    Buffer.from(JSON.stringify(settings), "utf8"),
    { contentType: "application/json", cacheControl: "0", upsert: true },
  );
  if (error) throw new Error("TOPページ設定を保存できませんでした。もう一度お試しください。");
  return settings;
}
