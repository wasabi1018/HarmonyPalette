import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/supabase/auth-server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { sameOriginAdminRequest } from "@/lib/instagram-dm/admin-request";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOriginAdminRequest(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const access = await getAdminAccess();
  const db = getSupabaseAdminClient();
  if (!access.ok || !db) return NextResponse.json({ error: "管理者ログインまたはSupabaseの設定が必要です。" }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const campaignId = String(form?.get("campaignId") || "");
  const characterName = String(form?.get("characterName") || "").trim();
  const keywords = String(form?.get("keywords") || "").split(/[,、\n]/).map((word) => word.trim()).filter(Boolean);
  const dmText = String(form?.get("dmText") || "").trim();
  const image = form?.get("image");
  if (!/^[0-9a-f-]{36}$/i.test(campaignId) || !characterName || characterName.length > 80
    || keywords.length < 1 || keywords.length > 20 || keywords.some((word) => word.length > 80)
    || !dmText || dmText.length > 1000 || !(image instanceof File)
    || image.type !== "image/png" || image.size < 24 || image.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "入力内容またはPNG画像が正しくありません。" }, { status: 400 });
  }
  const imageBytes = new Uint8Array(await image.arrayBuffer());
  if (imageBytes.subarray(0, 8).some((byte, index) => byte !== [137, 80, 78, 71, 13, 10, 26, 10][index])) {
    return NextResponse.json({ error: "PNG形式の画像を選択してください。" }, { status: 400 });
  }
  const header = new DataView(imageBytes.buffer, imageBytes.byteOffset, imageBytes.byteLength);
  if (header.getUint32(16) !== 1080 || header.getUint32(20) !== 1350) {
    return NextResponse.json({ error: "1080×1350pxのPNG画像を選択してください。" }, { status: 400 });
  }
  const { data: campaign, error: campaignError } = await db.from("instagram_dm_campaigns")
    .select("id,status").eq("id", campaignId).maybeSingle();
  if (campaignError) return NextResponse.json({ error: campaignError.message }, { status: 500 });
  if (!campaign) return NextResponse.json({ error: "キャンペーンが見つかりません。" }, { status: 404 });
  if (campaign.status !== "draft") return NextResponse.json({ error: "画像は下書きキャンペーンにのみ追加できます。" }, { status: 400 });

  const path = `${campaignId}/${randomUUID()}.png`;
  const { error: uploadError } = await db.storage.from("instagram-dm-images")
    .upload(path, imageBytes, { contentType: "image/png", upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
  const { data, error } = await db.from("instagram_dm_assets").insert({
    campaign_id: campaignId, character_name: characterName, keywords, image_path: path, dm_text: dmText,
  }).select("id").single();
  if (error) {
    await db.storage.from("instagram-dm-images").remove([path]);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ id: data.id }, { status: 201 });
}
