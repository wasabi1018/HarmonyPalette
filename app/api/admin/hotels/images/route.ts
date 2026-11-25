import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { authorizeTravelAdmin, limitedBody } from "@/lib/travel/admin-request";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const denied = await authorizeTravelAdmin(request, true);
  if (denied) return denied;
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(
      request.headers.get("content-type") ?? "",
    )
  )
    return Response.json(
      { error: "JPEG・PNG・WebPを選択してください。" },
      { status: 415 },
    );
  try {
    const bytes = await limitedBody(request, 5 * 1024 * 1024);
    const image = sharp(bytes, { limitInputPixels: 25000000 }).rotate();
    const [full, card] = await Promise.all([
      image
        .clone()
        .resize({
          width: 1440,
          height: 1080,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toBuffer(),
      image
        .clone()
        .resize({
          width: 480,
          height: 360,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 78 })
        .toBuffer(),
    ]);
    const client = getSupabaseAdminClient();
    if (!client) throw new Error("setup");
    const imageId = randomUUID();
    const path = `${imageId}.webp`;
    const results = await Promise.all([
      client.storage
        .from("hotel-images")
        .upload(path, full, { contentType: "image/webp" }),
      client.storage
        .from("hotel-images")
        .upload(`${imageId}-card.webp`, card, { contentType: "image/webp" }),
    ]);
    if (results.some((r) => r.error)) throw new Error("upload");
    return Response.json({ path });
  } catch {
    return Response.json(
      {
        error:
          "画像を保存できませんでした。5MB以内の画像とStorageの設定を確認してください。",
      },
      { status: 400 },
    );
  }
}
