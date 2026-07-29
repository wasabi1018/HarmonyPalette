import "server-only";

import {
  defaultInstagramPostUrls,
  normalizeInstagramPostUrls,
  type InstagramPostUrls,
} from "@/data/instagram-posts";
import {
  getSupabaseAdminClient,
  getSupabaseReadClient,
} from "@/lib/supabase/server";

const SETTINGS_BUCKET = "site-settings";
const SETTINGS_PATH = "instagram/homepage-posts.json";

export type InstagramEmbedSettings = {
  postUrls: InstagramPostUrls;
  updatedAt: string | null;
};

function defaultSettings(): InstagramEmbedSettings {
  return {
    postUrls: [...defaultInstagramPostUrls],
    updatedAt: null,
  };
}

export async function getInstagramEmbedSettings(): Promise<InstagramEmbedSettings> {
  const client = getSupabaseAdminClient() || getSupabaseReadClient();
  if (!client) return defaultSettings();

  const { data, error } = await client.storage
    .from(SETTINGS_BUCKET)
    .download(SETTINGS_PATH);
  if (error || !data) return defaultSettings();

  try {
    const value = JSON.parse(await data.text()) as {
      postUrls?: unknown;
      updatedAt?: unknown;
    };
    return {
      postUrls: normalizeInstagramPostUrls(value.postUrls),
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null,
    };
  } catch {
    return defaultSettings();
  }
}

async function ensureSettingsBucket() {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw new Error("Supabaseのサーバー用秘密鍵が設定されていません。");
  }

  const { data } = await client.storage.getBucket(SETTINGS_BUCKET);
  if (data) return client;

  const { error } = await client.storage.createBucket(SETTINGS_BUCKET, {
    public: false,
    fileSizeLimit: 10240,
    allowedMimeTypes: ["application/json"],
  });
  if (error && !/already exists|duplicate/i.test(error.message)) {
    throw new Error(error.message);
  }
  return client;
}

export async function updateInstagramEmbedSettings(
  values: unknown,
): Promise<InstagramEmbedSettings> {
  const postUrls = normalizeInstagramPostUrls(values);
  const updatedAt = new Date().toISOString();
  const client = await ensureSettingsBucket();
  const payload = Buffer.from(JSON.stringify({ postUrls, updatedAt }, null, 2), "utf8");
  const { error } = await client.storage
    .from(SETTINGS_BUCKET)
    .upload(SETTINGS_PATH, payload, {
      contentType: "application/json",
      cacheControl: "0",
      upsert: true,
    });
  if (error) throw new Error(error.message);
  return { postUrls, updatedAt };
}
