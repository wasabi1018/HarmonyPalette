import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  mergeRakutenCredentials, parseRakutenSettingsPatch, rakutenSettingsStatus,
  RakutenSettingsError, type RakutenCredentials, type RakutenSettingsStatus,
} from "@/lib/rakuten-settings-input";

// Keep credentials separate from settings that may later need broader read policies.
const SETTINGS_BUCKET = "integration-secrets";
const SETTINGS_PATH = "rakuten.json";
type StoredSettings = RakutenCredentials & { updatedAt: string | null };
type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

function adminClient(): AdminClient {
  const client = getSupabaseAdminClient();
  if (!client) throw new RakutenSettingsError("設定の保存に必要なサーバー設定が不足しています。", 503);
  return client;
}

function isMissing(error: { message: string } | null) {
  return Boolean(error && /not found|not exist/i.test(error.message));
}

async function privateBucketExists(client: AdminClient) {
  const { data, error } = await client.storage.getBucket(SETTINGS_BUCKET);
  if (error && !isMissing(error)) throw new RakutenSettingsError("設定の保存先を確認できませんでした。", 503);
  if (!data) return false;
  // Do not read or upload secrets if this bucket was made public.
  if (data.public !== false) throw new RakutenSettingsError("設定の保存先が非公開になっていません。保存先の設定を確認してください。", 503);
  return true;
}

export async function getRakutenSettings(): Promise<StoredSettings> {
  const empty: StoredSettings = { applicationId: "", accessKey: "", affiliateId: "", updatedAt: null };
  const client = adminClient();
  if (!await privateBucketExists(client)) return empty;
  const { data, error } = await client.storage.from(SETTINGS_BUCKET).download(SETTINGS_PATH);
  if (isMissing(error)) return empty;
  if (error) throw new RakutenSettingsError("楽天API設定を取得できませんでした。再読み込みしてください。", 503);
  if (!data) throw new RakutenSettingsError("保存済みの楽天API設定を読み込めませんでした。", 503);
  try {
    const value = JSON.parse(await data.text()) as Record<string, unknown>;
    const credentials = mergeRakutenCredentials(empty, parseRakutenSettingsPatch(value));
    const updatedAt = typeof value.updatedAt === "string" && Number.isFinite(Date.parse(value.updatedAt)) ? value.updatedAt : null;
    return { ...credentials, updatedAt };
  } catch {
    throw new RakutenSettingsError("保存済みの楽天API設定を読み込めませんでした。", 503);
  }
}

// Only presence flags may cross the server/client boundary.
export async function getRakutenSettingsStatus(): Promise<RakutenSettingsStatus> {
  const settings = await getRakutenSettings();
  return rakutenSettingsStatus(settings, settings.updatedAt);
}

export async function resolveRakutenSettings(patch: Partial<RakutenCredentials>) {
  return mergeRakutenCredentials(await getRakutenSettings(), patch);
}

export async function updateRakutenSettings(patch: Partial<RakutenCredentials>): Promise<RakutenSettingsStatus> {
  const credentials = await resolveRakutenSettings(patch);
  const client = adminClient();
  if (!await privateBucketExists(client)) {
    const { error } = await client.storage.createBucket(SETTINGS_BUCKET, {
      public: false, fileSizeLimit: 10240, allowedMimeTypes: ["application/json"],
    });
    if (error && !/already exists|duplicate/i.test(error.message)) {
      throw new RakutenSettingsError("設定の保存先を作成できませんでした。", 503);
    }
    if (!await privateBucketExists(client)) throw new RakutenSettingsError("設定の保存先を確認できませんでした。", 503);
  }
  const updatedAt = new Date().toISOString();
  const { error } = await client.storage.from(SETTINGS_BUCKET).upload(SETTINGS_PATH,
    Buffer.from(JSON.stringify({ ...credentials, updatedAt }), "utf8"),
    { contentType: "application/json", cacheControl: "0", upsert: true },
  );
  if (error) throw new RakutenSettingsError("楽天API設定を保存できませんでした。もう一度お試しください。", 503);
  return rakutenSettingsStatus(credentials, updatedAt);
}
