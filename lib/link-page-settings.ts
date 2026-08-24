import "server-only";

import {
  getSupabaseAdminClient,
  getSupabaseReadClient,
} from "@/lib/supabase/server";
import { normalizeRakutenRoomUrl } from "@/lib/rakuten-room-url";

const SETTINGS_BUCKET = "site-settings";
const SETTINGS_PATH = "links/profile.json";

export type LinkPageSettings = {
  rakutenRoomUrl: string;
  updatedAt: string | null;
};

function defaultSettings(): LinkPageSettings {
  return {
    rakutenRoomUrl: "",
    updatedAt: null,
  };
}

export async function getLinkPageSettings(): Promise<LinkPageSettings> {
  const client = getSupabaseAdminClient() || getSupabaseReadClient();
  if (!client) return defaultSettings();

  const { data, error } = await client.storage
    .from(SETTINGS_BUCKET)
    .download(SETTINGS_PATH);
  if (error || !data) return defaultSettings();

  try {
    const value = JSON.parse(await data.text()) as {
      rakutenRoomUrl?: unknown;
      updatedAt?: unknown;
    };
    return {
      rakutenRoomUrl: normalizeRakutenRoomUrl(value.rakutenRoomUrl),
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

export async function updateLinkPageSettings(
  value: unknown,
): Promise<LinkPageSettings> {
  const rakutenRoomUrl = normalizeRakutenRoomUrl(value);
  const updatedAt = new Date().toISOString();
  const client = await ensureSettingsBucket();
  const payload = Buffer.from(JSON.stringify({ rakutenRoomUrl, updatedAt }, null, 2), "utf8");
  const { error } = await client.storage
    .from(SETTINGS_BUCKET)
    .upload(SETTINGS_PATH, payload, {
      contentType: "application/json",
      cacheControl: "0",
      upsert: true,
    });
  if (error) throw new Error(error.message);
  return { rakutenRoomUrl, updatedAt };
}
