import "server-only";

import type { ArticleMedia } from "@/lib/articles/types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type Row = Record<string, unknown>;

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mapMedia(row: Row): ArticleMedia {
  return {
    id: asText(row.id),
    storagePath: asText(row.storage_path),
    publicUrl: asText(row.public_url),
    fileName: asText(row.file_name),
    mimeType: asText(row.mime_type),
    sizeBytes: Number(row.size_bytes || 0),
    width: asNullableNumber(row.width),
    height: asNullableNumber(row.height),
    altText: asText(row.alt_text),
    createdAt: asText(row.created_at),
    updatedAt: asText(row.updated_at),
  };
}

function requireAdminClient() {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabaseのサーバー用秘密鍵が設定されていません。");
  return client;
}

export async function listArticleMedia() {
  const client = requireAdminClient();
  const { data, error } = await client
    .from("article_media")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapMedia(row as Row));
}

export async function createArticleMedia(input: {
  storagePath: string;
  publicUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  altText: string;
  createdBy: string | null;
}) {
  const client = requireAdminClient();
  const { data, error } = await client
    .from("article_media")
    .insert({
      storage_path: input.storagePath,
      public_url: input.publicUrl,
      file_name: input.fileName,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      width: input.width,
      height: input.height,
      alt_text: input.altText,
      created_by: input.createdBy,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapMedia(data as Row);
}

export async function updateArticleMedia(id: string, altText: string) {
  const normalized = altText.trim();
  if (normalized.length > 300) throw new Error("代替テキストは300文字以内で入力してください。");
  const client = requireAdminClient();
  const { data, error } = await client
    .from("article_media")
    .update({ alt_text: normalized })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapMedia(data as Row) : null;
}

export async function deleteArticleMedia(id: string) {
  const client = requireAdminClient();
  const { data: media, error: mediaError } = await client
    .from("article_media")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (mediaError) throw new Error(mediaError.message);
  if (!media) return false;
  const item = mapMedia(media as Row);

  const [
    { count: coverCount, error: coverError },
    { data: bodyMatches, error: bodyError },
  ] = await Promise.all([
    client.from("articles").select("id", { count: "exact", head: true }).eq("cover_image_url", item.publicUrl),
    client.from("articles").select("id").ilike("content_html", `%${item.publicUrl}%`).limit(1),
  ]);
  if (coverError || bodyError) {
    throw new Error(
      coverError?.message
      || bodyError?.message
      || "画像の使用状況を確認できませんでした。",
    );
  }
  if ((coverCount || 0) > 0 || (bodyMatches?.length || 0) > 0) {
    throw new Error("この画像は記事または変更履歴で使用されているため削除できません。");
  }

  for (let offset = 0; ; offset += 500) {
    const { data: revisions, error: revisionError } = await client
      .from("article_revisions")
      .select("snapshot")
      .range(offset, offset + 499);
    if (revisionError) throw new Error(revisionError.message);
    const usedInRevision = (revisions ?? []).some((revision) => (
      JSON.stringify((revision as Row).snapshot || {}).includes(item.publicUrl)
    ));
    if (usedInRevision) {
      throw new Error("この画像は記事または変更履歴で使用されているため削除できません。");
    }
    if ((revisions?.length || 0) < 500) break;
  }

  const { error: storageError } = await client.storage
    .from("article-images")
    .remove([item.storagePath]);
  if (storageError) throw new Error(storageError.message);
  const { error: deleteError } = await client.from("article_media").delete().eq("id", id);
  if (deleteError) throw new Error(deleteError.message);
  return true;
}
