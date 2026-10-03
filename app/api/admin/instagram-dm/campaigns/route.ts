import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/supabase/auth-server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getMetaConfig } from "@/lib/instagram-dm/meta";
import { sameOriginAdminRequest } from "@/lib/instagram-dm/admin-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function adminDb() {
  const access = await getAdminAccess();
  if (!access.ok) return null;
  return getSupabaseAdminClient();
}

export async function GET(request: Request) {
  const db = await adminDb();
  if (!db) return NextResponse.json({ error: "管理者ログインまたはSupabaseの設定が必要です。" }, { status: 401 });
  const campaignId = new URL(request.url).searchParams.get("id");
  if (campaignId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(campaignId)) {
    return NextResponse.json({ error: "キャンペーンIDが正しくありません。" }, { status: 400 });
  }
  let campaignQuery = db.from("instagram_dm_campaigns")
    .select("id,month,reel_media_id,status,created_at,instagram_dm_assets(id,character_name,keywords,image_path,dm_text)")
    .order("created_at", { ascending: false });
  campaignQuery = campaignId ? campaignQuery.eq("id", campaignId) : campaignQuery.limit(30);
  const { data: campaigns, error } = await campaignQuery;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  let deliveryQuery = db.from("instagram_dm_deliveries")
    .select("id,campaign_id,status,comment_id,created_at,last_error,follow_status")
    .order("created_at", { ascending: false }).limit(100);
  if (campaignId) deliveryQuery = deliveryQuery.eq("campaign_id", campaignId);
  const { data: deliveries, error: deliveryError } = await deliveryQuery;
  if (deliveryError) return NextResponse.json({ error: deliveryError.message }, { status: 500 });
  const campaignsWithImages = campaigns?.map((campaign) => ({
    ...campaign,
    instagram_dm_assets: campaign.instagram_dm_assets.map((asset) => ({
      ...asset,
      image_url: db.storage.from("instagram-dm-images").getPublicUrl(asset.image_path).data.publicUrl,
    })),
  }));
  return NextResponse.json({ campaigns: campaignsWithImages, deliveries, metaConfigured: Boolean(getMetaConfig()) });
}

export async function POST(request: Request) {
  if (!sameOriginAdminRequest(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = await adminDb();
  if (!db) return NextResponse.json({ error: "管理者ログインまたはSupabaseの設定が必要です。" }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const month = typeof body?.month === "string" ? body.month.trim() : "";
  const reelMediaId = typeof body?.reelMediaId === "string" ? body.reelMediaId.trim() : "";
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month) || !/^\d{5,100}$/.test(reelMediaId)) {
    return NextResponse.json({ error: "対象月またはReelのメディアIDが正しくありません。" }, { status: 400 });
  }
  const { data, error } = await db.from("instagram_dm_campaigns")
    .insert({ month, reel_media_id: reelMediaId }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!sameOriginAdminRequest(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = await adminDb();
  if (!db) return NextResponse.json({ error: "管理者ログインまたはSupabaseの設定が必要です。" }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const id = typeof body?.id === "string" ? body.id : "";
  const status = body?.status;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["active", "paused"].includes(String(status))) {
    return NextResponse.json({ error: "更新内容が正しくありません。" }, { status: 400 });
  }
  if (status === "active") {
    if (!getMetaConfig()) return NextResponse.json({ error: "Meta APIの環境変数が揃っていません。" }, { status: 400 });
    const { count, error } = await db.from("instagram_dm_assets")
      .select("id", { count: "exact", head: true }).eq("campaign_id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!count) return NextResponse.json({ error: "画像とDM文言を1件以上登録してください。" }, { status: 400 });
  }
  const { data, error } = await db.from("instagram_dm_campaigns")
    .update({ status, updated_at: new Date().toISOString() }).eq("id", id)
    .select("id,status").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "キャンペーンが見つかりません。" }, { status: 404 });
  if (status === "active") {
    const { error: wakeError } = await db.from("instagram_dm_deliveries")
      .update({ next_attempt_at: new Date().toISOString() })
      .eq("campaign_id", id).is("last_error", null)
      .in("status", ["pending_intro", "pending_check", "pending_image", "pending_text", "pending_reply"]);
    if (wakeError) console.error("Instagram pending deliveries could not be woken", wakeError);
  }
  return NextResponse.json(data);
}
