import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { matchAsset, type Asset, type InstagramEvent } from "@/lib/instagram-dm/domain";

export async function persistInstagramEvent(event: InstagramEvent) {
  const db = getSupabaseAdminClient();
  if (!db) throw new Error("Supabase service role key is not configured");

  if (event.type === "comment") {
    const { data: campaign, error: campaignError } = await db.from("instagram_dm_campaigns")
      .select("id")
      .eq("reel_media_id", event.mediaId)
      .eq("status", "active")
      .maybeSingle();
    if (campaignError) throw campaignError;
    if (!campaign) return;

    const { data: assets, error: assetsError } = await db.from("instagram_dm_assets")
      .select("id,campaign_id,character_name,keywords,image_path,dm_text")
      .eq("campaign_id", campaign.id);
    if (assetsError) throw assetsError;
    const asset = matchAsset(event.text, (assets || []) as Asset[]);
    if (!asset) return;

    const { error } = await db.from("instagram_dm_deliveries").insert({
      campaign_id: campaign.id,
      asset_id: asset.id,
      comment_id: event.commentId,
      commenter_id: event.commenterId,
      comment_text: event.text.slice(0, 2000),
    });
    if (error && error.code !== "23505") throw error;
    return;
  }

  const { data: delivery, error: readError } = await db.from("instagram_dm_deliveries")
    .select("id,status,commenter_id")
    .eq("id", event.deliveryId)
    .maybeSingle();
  if (readError) throw readError;
  if (!delivery || delivery.commenter_id !== event.senderId) return;
  const expected = event.action === "OPEN" ? "awaiting_tap" : "awaiting_follow";
  if (delivery.status !== expected) return;
  const { error } = await db.from("instagram_dm_deliveries")
    .update({ status: "pending_check", next_attempt_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", delivery.id)
    .eq("status", expected);
  if (error) throw error;
}
