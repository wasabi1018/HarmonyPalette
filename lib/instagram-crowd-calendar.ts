import "server-only";

import {
  isCrowdMonth,
  normalizeCrowdOverrides,
  type CrowdCalendarOverrides,
} from "@/lib/crowd-calendar";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

const BUCKET = "site-settings";
const PREFIX = "instagram/crowd-calendar";

export type CrowdCalendarDraft = {
  month: string;
  overrides: CrowdCalendarOverrides;
  updatedAt: string | null;
};

function clientOrThrow() {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabaseのサーバー用秘密鍵が設定されていません。");
  return client;
}

function pathForMonth(month: string) {
  if (!isCrowdMonth(month)) throw new Error("対象月を確認してください。");
  return `${PREFIX}/${month}.json`;
}

export async function getCrowdCalendarDraft(month: string): Promise<CrowdCalendarDraft> {
  const path = pathForMonth(month);
  const client = clientOrThrow();
  const { data, error } = await client.storage.from(BUCKET).download(path);

  if (error) {
    const statusCode = Number((error as { statusCode?: string | number }).statusCode);
    if (statusCode === 404 || /not found/i.test(error.message)) {
      return { month, overrides: {}, updatedAt: null };
    }
    throw new Error(error.message);
  }
  if (!data) return { month, overrides: {}, updatedAt: null };

  try {
    const value = JSON.parse(await data.text()) as {
      month?: unknown;
      overrides?: unknown;
      updatedAt?: unknown;
    };
    if (value.month !== month) throw new Error("保存済みの対象月が一致しません。");
    return {
      month,
      overrides: normalizeCrowdOverrides(month, value.overrides),
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null,
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "保存済みデータを読み込めませんでした。");
  }
}

async function ensurePrivateBucket() {
  const client = clientOrThrow();
  const { data, error } = await client.storage.getBucket(BUCKET);
  if (data) {
    if (data.public) throw new Error("保存先の公開設定を確認してください。");
    return client;
  }
  if (error && !/not found/i.test(error.message)) throw new Error(error.message);

  const created = await client.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 10240,
    allowedMimeTypes: ["application/json"],
  });
  if (created.error && !/already exists|duplicate/i.test(created.error.message)) {
    throw new Error(created.error.message);
  }
  return client;
}

export async function saveCrowdCalendarDraft(
  month: string,
  input: unknown,
): Promise<CrowdCalendarDraft> {
  const path = pathForMonth(month);
  const overrides = normalizeCrowdOverrides(month, input);
  const updatedAt = new Date().toISOString();
  const client = await ensurePrivateBucket();
  const payload = Buffer.from(JSON.stringify({ version: 1, month, overrides, updatedAt }), "utf8");
  const { error } = await client.storage.from(BUCKET).upload(path, payload, {
    contentType: "application/json",
    cacheControl: "0",
    upsert: true,
  });
  if (error) throw new Error(error.message);
  return { month, overrides, updatedAt };
}
