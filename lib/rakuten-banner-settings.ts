import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { createDefaultRakutenBanner, getRakutenBannerDefinition, parseRakutenBanner, type RakutenBannerDefinition, type RakutenBannerPlacement } from "@/lib/rakuten-banner";
import { RakutenSettingsError } from "@/lib/rakuten-settings-input";

const BUCKET = "site-settings";
type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

function client() {
  const value = getSupabaseAdminClient();
  if (!value) throw new RakutenSettingsError("バナーの保存に必要なサーバー設定が不足しています。", 503);
  return value;
}
function objectPath(definition: RakutenBannerDefinition) {
  if (!/^[a-z][a-z0-9-]{1,79}$/.test(definition.id)) throw new RakutenSettingsError("バナーの掲載場所を確認してください。");
  return `rakuten-banners/${definition.id}.json`;
}
function isMissing(error: { message: string } | null) { return Boolean(error && /not found|not exist/i.test(error.message)); }
async function bucketExists(value: AdminClient) {
  const { data, error } = await value.storage.getBucket(BUCKET);
  if (error && !isMissing(error)) throw new RakutenSettingsError("バナーの保存先を確認できませんでした。", 503);
  if (!data) return false;
  if (data.public !== false) throw new RakutenSettingsError("バナーの保存先を非公開に設定してください。", 503);
  return true;
}

export async function getRakutenBanner(definition: RakutenBannerDefinition): Promise<RakutenBannerPlacement> {
  const path = objectPath(definition);
  const value = client();
  if (!await bucketExists(value)) return createDefaultRakutenBanner(definition);
  const { data, error } = await value.storage.from(BUCKET).download(path);
  if (isMissing(error)) return createDefaultRakutenBanner(definition);
  if (error || !data) throw new RakutenSettingsError("バナーの掲載内容を取得できませんでした。再読み込みしてください。", 503);
  try {
    const stored = JSON.parse(await data.text()) as Record<string, unknown>;
    if (stored.placementId !== definition.id) throw new Error("Mismatched banner placement");
    return parseRakutenBanner(stored, definition);
  } catch { throw new RakutenSettingsError("保存済みのバナー掲載内容を読み込めませんでした。", 503); }
}

export async function updateRakutenBanner(definition: RakutenBannerDefinition, input: unknown) {
  const parsed = parseRakutenBanner(input, definition);
  await getRakutenBanner(definition);
  const value = client();
  if (!await bucketExists(value)) {
    const { error } = await value.storage.createBucket(BUCKET, { public: false, fileSizeLimit: 10240, allowedMimeTypes: ["application/json"] });
    if (error && !/already exists|duplicate/i.test(error.message)) throw new RakutenSettingsError("バナーの保存先を作成できませんでした。", 503);
    if (!await bucketExists(value)) throw new RakutenSettingsError("バナーの保存先を確認できませんでした。", 503);
  }
  const banner = { ...parsed, updatedAt: new Date().toISOString() };
  const payload = Buffer.from(JSON.stringify(banner), "utf8");
  if (payload.byteLength > 10240) throw new RakutenSettingsError("バナーの掲載内容が長すぎます。");
  const { error } = await value.storage.from(BUCKET).upload(objectPath(definition), payload, { contentType: "application/json", cacheControl: "0", upsert: true });
  if (error) throw new RakutenSettingsError("バナーの掲載内容を保存できませんでした。もう一度お試しください。", 503);
  return banner;
}

export async function getPublicRakutenBanner(placementId: string) {
  try {
    const banner = await getRakutenBanner(getRakutenBannerDefinition(placementId));
    return banner.enabled ? banner : null;
  } catch { return null; }
}
