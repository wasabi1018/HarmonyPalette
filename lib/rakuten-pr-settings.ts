import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { createDefaultRakutenPrPlacement, parseRakutenPrPlacement, type RakutenPrPlacementDefinition, type RakutenPrPlacement } from "@/lib/rakuten-pr";
import { RakutenSettingsError } from "@/lib/rakuten-settings-input";

const SETTINGS_BUCKET = "site-settings";
type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

function client(): AdminClient {
  const value = getSupabaseAdminClient();
  if (!value) throw new RakutenSettingsError("掲載内容の保存に必要なサーバー設定が不足しています。", 503);
  return value;
}

function objectPath(definition: RakutenPrPlacementDefinition) {
  if (!/^[a-z][a-z0-9-]{1,79}$/.test(definition.id)) throw new RakutenSettingsError("掲載場所を確認してください。");
  return `rakuten-pr/${definition.id}.json`;
}

function isMissing(error: { message: string } | null) {
  return Boolean(error && /not found|not exist/i.test(error.message));
}

async function bucketExists(value: AdminClient) {
  const { data, error } = await value.storage.getBucket(SETTINGS_BUCKET);
  if (error && !isMissing(error)) throw new RakutenSettingsError("掲載内容の保存先を確認できませんでした。", 503);
  if (!data) return false;
  if (data.public !== false) throw new RakutenSettingsError("掲載内容の保存先を非公開に設定してください。", 503);
  return true;
}

export async function getRakutenPrPlacement(definition: RakutenPrPlacementDefinition): Promise<RakutenPrPlacement> {
  const path = objectPath(definition);
  const value = client();
  if (!await bucketExists(value)) return createDefaultRakutenPrPlacement(definition);
  const { data, error } = await value.storage.from(SETTINGS_BUCKET).download(path);
  if (isMissing(error)) return createDefaultRakutenPrPlacement(definition);
  if (error || !data) throw new RakutenSettingsError("楽天PRの掲載内容を取得できませんでした。再読み込みしてください。", 503);
  try {
    const stored = JSON.parse(await data.text()) as Record<string, unknown>;
    if (stored.placementId !== definition.id) throw new Error("Mismatched placement");
    return parseRakutenPrPlacement(stored, definition);
  } catch {
    throw new RakutenSettingsError("保存済みの楽天PR掲載内容を読み込めませんでした。", 503);
  }
}

export async function updateRakutenPrPlacement(definition: RakutenPrPlacementDefinition, input: unknown): Promise<RakutenPrPlacement> {
  const parsed = parseRakutenPrPlacement(input, definition);
  // Refuse to overwrite corrupt saved content. Each placement has its own object.
  await getRakutenPrPlacement(definition);
  const value = client();
  if (!await bucketExists(value)) {
    const { error } = await value.storage.createBucket(SETTINGS_BUCKET, { public: false, fileSizeLimit: 10240, allowedMimeTypes: ["application/json"] });
    if (error && !/already exists|duplicate/i.test(error.message)) throw new RakutenSettingsError("掲載内容の保存先を作成できませんでした。", 503);
    if (!await bucketExists(value)) throw new RakutenSettingsError("掲載内容の保存先を確認できませんでした。", 503);
  }
  const settings = { ...parsed, updatedAt: new Date().toISOString() };
  const payload = Buffer.from(JSON.stringify(settings), "utf8");
  if (payload.byteLength > 10240) throw new RakutenSettingsError("掲載内容が長すぎます。紹介文を短くしてください。");
  const { error } = await value.storage.from(SETTINGS_BUCKET).upload(objectPath(definition), payload,
    { contentType: "application/json", cacheControl: "0", upsert: true });
  if (error) throw new RakutenSettingsError("楽天PRの掲載内容を保存できませんでした。もう一度お試しください。", 503);
  return settings;
}
