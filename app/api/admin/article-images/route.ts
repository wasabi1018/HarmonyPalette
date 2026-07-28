import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { createArticleMedia } from "@/lib/articles/media-repository";
import { getAdminAccess } from "@/lib/supabase/auth-server";
import {
  assertImportAuthorization,
  getSupabaseAdminClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(request: Request) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.message },
      { status: authorization.status },
    );
  }
  const client = getSupabaseAdminClient();
  if (!client) {
    return NextResponse.json(
      { error: "Supabaseのサーバー用秘密鍵が設定されていません。" },
      { status: 503 },
    );
  }

  let uploadedPath = "";
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("画像ファイルを選択してください。");
    const extension = imageExtensions[file.type];
    if (!extension) throw new Error("JPEG、PNG、WebP、GIF形式の画像を選択してください。");
    if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
      throw new Error("画像は10MB以内で選択してください。");
    }

    const altText = typeof formData.get("altText") === "string"
      ? String(formData.get("altText")).trim().slice(0, 300)
      : "";
    const buffer = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(buffer, { animated: true }).metadata();
    const date = new Date().toISOString().slice(0, 10);
    const path = `${date}/${randomUUID()}.${extension}`;
    const { error } = await client.storage
      .from("article-images")
      .upload(path, buffer, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });
    if (error) throw new Error(error.message);
    uploadedPath = path;

    const { data } = client.storage.from("article-images").getPublicUrl(path);
    const access = await getAdminAccess();
    const media = await createArticleMedia({
      storagePath: path,
      publicUrl: data.publicUrl,
      fileName: (file.name || `image.${extension}`).slice(0, 255),
      mimeType: file.type,
      sizeBytes: file.size,
      width: metadata.width || null,
      height: metadata.height || null,
      altText,
      createdBy: access.ok ? access.user.id : null,
    });
    return NextResponse.json({
      ok: true,
      url: data.publicUrl,
      path,
      media,
    }, { status: 201 });
  } catch (error) {
    if (uploadedPath) {
      await client.storage.from("article-images").remove([uploadedPath]);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "画像のアップロードに失敗しました。" },
      { status: 400 },
    );
  }
}
