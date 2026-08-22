import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";

loadEnvConfig(process.cwd());

const bucket = "article-images";
const optimizedPrefix = "optimized-v1";
const minimumSourceBytes = 750 * 1024;
const minimumSavingRatio = 0.1;
const apply = process.argv.includes("--apply");

type StorageObject = {
  name: string;
  id: string | null;
  metadata: Record<string, unknown> | null;
};

type Compression = {
  originalPath: string;
  optimizedPath: string;
  originalUrl: string;
  optimizedUrl: string;
  originalBytes: number;
  optimizedBytes: number;
  width: number | null;
  height: number | null;
};

function requireClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secretKey) throw new Error("Supabaseのサーバー用設定が見つかりません。");
  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { "x-application-name": "harmony-palette-image-compression" } },
  });
}

function objectSize(item: StorageObject) {
  const value = item.metadata?.size;
  return typeof value === "number" ? value : Number(value || 0);
}

async function listObjects(client: SupabaseClient, prefix = ""): Promise<Array<StorageObject & { path: string }>> {
  const { data, error } = await client.storage.from(bucket).list(prefix, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) throw new Error(`画像一覧を取得できませんでした: ${error.message}`);

  const result: Array<StorageObject & { path: string }> = [];
  for (const raw of data ?? []) {
    const item = raw as StorageObject;
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (!item.id) {
      if (path !== optimizedPrefix) result.push(...await listObjects(client, path));
      continue;
    }
    result.push({ ...item, path });
  }
  return result;
}

function optimizedPath(path: string) {
  const extensionIndex = path.lastIndexOf(".");
  const base = extensionIndex > path.lastIndexOf("/") ? path.slice(0, extensionIndex) : path;
  return `${optimizedPrefix}/${base}.webp`;
}

function publicUrl(client: SupabaseClient, path: string) {
  return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

async function compressObject(client: SupabaseClient, path: string) {
  const { data, error } = await client.storage.from(bucket).download(path);
  if (error || !data) throw new Error(`${path}を取得できませんでした: ${error?.message || "no data"}`);
  const source = Buffer.from(await data.arrayBuffer());
  const metadata = await sharp(source, { animated: true }).metadata();
  if (Number(metadata.pages || 1) > 1) return null;

  const converted = await sharp(source)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80, effort: 4, smartSubsample: true })
    .toBuffer({ resolveWithObject: true });

  if (converted.data.byteLength >= source.byteLength * (1 - minimumSavingRatio)) return null;
  return {
    buffer: converted.data,
    width: converted.info.width,
    height: converted.info.height,
    originalBytes: source.byteLength,
  };
}

function replaceUrls(value: string, compressions: Compression[]) {
  let result = value;
  for (const item of compressions) {
    result = result.replaceAll(item.originalUrl, item.optimizedUrl);
    result = result.replaceAll(
      `/api/article-images/${item.originalPath.split("/").map(encodeURIComponent).join("/")}`,
      `/api/article-images/${item.optimizedPath.split("/").map(encodeURIComponent).join("/")}`,
    );
  }
  return result;
}

function replaceSnapshot(value: unknown, compressions: Compression[]) {
  const serialized = JSON.stringify(value);
  const replaced = replaceUrls(serialized, compressions);
  return replaced === serialized ? value : JSON.parse(replaced) as unknown;
}

async function updateReferences(client: SupabaseClient, compressions: Compression[]) {
  let articleUpdates = 0;
  let mediaUpdates = 0;
  let revisionUpdates = 0;

  const { data: articles, error: articleError } = await client
    .from("articles")
    .select("id,cover_image_url,content_html");
  if (articleError) throw new Error(`記事を取得できませんでした: ${articleError.message}`);
  for (const article of articles ?? []) {
    const coverImageUrl = replaceUrls(String(article.cover_image_url || ""), compressions);
    const contentHtml = replaceUrls(String(article.content_html || ""), compressions);
    if (coverImageUrl === article.cover_image_url && contentHtml === article.content_html) continue;
    const { error } = await client.from("articles").update({
      cover_image_url: coverImageUrl,
      content_html: contentHtml,
    }).eq("id", article.id);
    if (error) throw new Error(`記事参照を更新できませんでした: ${error.message}`);
    articleUpdates += 1;
  }

  const byOriginalPath = new Map(compressions.map((item) => [item.originalPath, item]));
  const { data: media, error: mediaError } = await client
    .from("article_media")
    .select("id,storage_path,file_name");
  if (mediaError) throw new Error(`メディアを取得できませんでした: ${mediaError.message}`);
  for (const row of media ?? []) {
    const item = byOriginalPath.get(String(row.storage_path || ""));
    if (!item) continue;
    const originalName = String(row.file_name || "image");
    const fileName = `${originalName.replace(/\.[^.]+$/, "")}.webp`.slice(0, 255);
    const { error } = await client.from("article_media").update({
      storage_path: item.optimizedPath,
      public_url: item.optimizedUrl,
      file_name: fileName,
      mime_type: "image/webp",
      size_bytes: item.optimizedBytes,
      width: item.width,
      height: item.height,
    }).eq("id", row.id);
    if (error) throw new Error(`メディア参照を更新できませんでした: ${error.message}`);
    mediaUpdates += 1;
  }

  const { data: revisions, error: revisionError } = await client
    .from("article_revisions")
    .select("id,snapshot");
  if (revisionError) throw new Error(`改訂履歴を取得できませんでした: ${revisionError.message}`);
  for (const revision of revisions ?? []) {
    const snapshot = replaceSnapshot(revision.snapshot, compressions);
    if (snapshot === revision.snapshot) continue;
    const { error } = await client.from("article_revisions").update({ snapshot }).eq("id", revision.id);
    if (error) throw new Error(`改訂履歴を更新できませんでした: ${error.message}`);
    revisionUpdates += 1;
  }

  return { articleUpdates, mediaUpdates, revisionUpdates };
}

function megabytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  const client = requireClient();
  const objects = await listObjects(client);
  const candidates = objects.filter((item) => (
    !item.path.startsWith(`${optimizedPrefix}/`)
    && objectSize(item) >= minimumSourceBytes
    && /^image\/(?:jpeg|png|webp)$/i.test(String(item.metadata?.mimetype || ""))
  ));
  const candidateBytes = candidates.reduce((sum, item) => sum + objectSize(item), 0);

  console.log(`対象候補: ${candidates.length}件 / ${megabytes(candidateBytes)}`);
  if (!apply) {
    for (const item of candidates) console.log(`${megabytes(objectSize(item)).padStart(10)}  ${item.path}`);
    console.log("ドライランです。変更するには --apply を指定してください。");
    return;
  }

  const existingPaths = new Map(objects.map((item) => [item.path, item]));
  const compressions: Compression[] = [];
  for (const [index, item] of candidates.entries()) {
    const destination = optimizedPath(item.path);
    const existing = existingPaths.get(destination);
    if (existing) {
      compressions.push({
        originalPath: item.path,
        optimizedPath: destination,
        originalUrl: publicUrl(client, item.path),
        optimizedUrl: publicUrl(client, destination),
        originalBytes: objectSize(item),
        optimizedBytes: objectSize(existing),
        width: Number(existing.metadata?.width || 0) || null,
        height: Number(existing.metadata?.height || 0) || null,
      });
      continue;
    }

    console.log(`[${index + 1}/${candidates.length}] ${item.path}`);
    const compressed = await compressObject(client, item.path);
    if (!compressed) {
      console.log("  十分な削減効果がないかアニメーション画像のためスキップ");
      continue;
    }
    const { error } = await client.storage.from(bucket).upload(destination, compressed.buffer, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) throw new Error(`${destination}をアップロードできませんでした: ${error.message}`);
    compressions.push({
      originalPath: item.path,
      optimizedPath: destination,
      originalUrl: publicUrl(client, item.path),
      optimizedUrl: publicUrl(client, destination),
      originalBytes: compressed.originalBytes,
      optimizedBytes: compressed.buffer.byteLength,
      width: compressed.width,
      height: compressed.height,
    });
  }

  if (compressions.length === 0) {
    console.log("圧縮対象はありませんでした。");
    return;
  }
  const updates = await updateReferences(client, compressions);
  const originalBytes = compressions.reduce((sum, item) => sum + item.originalBytes, 0);
  const optimizedBytes = compressions.reduce((sum, item) => sum + item.optimizedBytes, 0);
  console.log(JSON.stringify({
    compressedImages: compressions.length,
    originalSize: megabytes(originalBytes),
    optimizedSize: megabytes(optimizedBytes),
    reduction: `${((1 - optimizedBytes / originalBytes) * 100).toFixed(1)}%`,
    ...updates,
    originalsDeleted: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
