import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { followDecision, statusAfterTextSent, type Asset, type Campaign, type CommentReplyStatus, type Delivery, type DeliveryStatus } from "@/lib/instagram-dm/domain";
import {
  checkFollowing, MetaApiError, replyToComment, sendFollowPrompt,
  sendImage, sendIntro, sendText,
} from "@/lib/instagram-dm/meta";

type DeliveryPatch = Partial<Delivery> & { last_error?: string | null; next_attempt_at?: string; lease_until?: string | null; updated_at?: string; comment_reply_next_attempt_at?: string; comment_reply_lease_until?: string | null; comment_reply_last_error?: string | null };

class DeliveryStateError extends Error {
  constructor(message: string) { super(message); }
}

async function updateDelivery(id: string, expected: DeliveryStatus, patch: DeliveryPatch) {
  const db = getSupabaseAdminClient();
  if (!db) throw new Error("Supabase service role key is not configured");
  const { data, error } = await db.from("instagram_dm_deliveries")
    .update({ ...patch, lease_until: null, updated_at: new Date().toISOString() })
    .eq("id", id).eq("status", expected).select("id").maybeSingle();
  if (error) throw new DeliveryStateError(error.message);
  if (!data) throw new DeliveryStateError(`Delivery ${id} was changed concurrently`);
}

async function updateCommentReply(id: string, patch: DeliveryPatch) {
  const db = getSupabaseAdminClient();
  if (!db) throw new Error("Supabase service role key is not configured");
  const { data, error } = await db.from("instagram_dm_deliveries")
    .update({ ...patch, comment_reply_lease_until: null, updated_at: new Date().toISOString() })
    .eq("id", id).eq("comment_reply_status", "pending").select("id").maybeSingle();
  if (error) throw new DeliveryStateError(error.message);
  if (!data) throw new DeliveryStateError(`Comment reply ${id} was changed concurrently`);
}

async function processDelivery(initial: Delivery) {
  const db = getSupabaseAdminClient();
  if (!db) throw new Error("Supabase service role key is not configured");
  const [{ data: asset, error: assetError }, { data: campaign, error: campaignError }] = await Promise.all([
    db.from("instagram_dm_assets").select("*").eq("id", initial.asset_id).single(),
    db.from("instagram_dm_campaigns").select("*").eq("id", initial.campaign_id).single(),
  ]);
  if (assetError || campaignError || !asset || !campaign) throw assetError || campaignError || new Error("Campaign asset is missing");
  const a = asset as Asset;
  const c = campaign as Campaign;
  if (c.status !== "active") {
    await updateDelivery(initial.id, initial.status, { next_attempt_at: new Date(Date.now() + 5 * 60_000).toISOString() });
    return;
  }
  const status = initial.status;
  if (status === "pending_intro") {
    const result = await sendIntro(initial.comment_id, initial.id, a.character_name);
    await updateDelivery(initial.id, status, {
      status: "awaiting_tap", intro_message_id: result.message_id, last_error: null,
      comment_reply_status: "pending", comment_reply_next_attempt_at: new Date().toISOString(),
    });
    return;
  }
  if (status === "pending_check") {
    const followStatus = await checkFollowing(initial.commenter_id);
    if (followDecision(followStatus) === "awaiting_follow") {
      const result = await sendFollowPrompt(initial.commenter_id, initial.id);
      await updateDelivery(initial.id, status, {
        status: "awaiting_follow", follow_status: followStatus,
        follow_message_id: result.message_id, last_error: null,
      });
      return;
    }
    await updateDelivery(initial.id, status, { status: "pending_image", follow_status: followStatus, last_error: null });
    return;
  }
  if (status === "pending_image") {
    const { data } = db.storage.from("instagram-dm-images").getPublicUrl(a.image_path);
    const result = await sendImage(initial.commenter_id, data.publicUrl);
    await updateDelivery(initial.id, status, { status: "pending_text", image_message_id: result.message_id, last_error: null });
    return;
  }
  if (status === "pending_text") {
    const result = await sendText(initial.commenter_id, a.dm_text);
    // Deliveries created before the migration retain the old final-reply stage.
    const nextStatus = statusAfterTextSent(initial.comment_reply_status);
    await updateDelivery(initial.id, status, { status: nextStatus, text_message_id: result.message_id, last_error: null });
    return;
  }
  if (status === "pending_reply") {
    const result = await replyToComment(initial.comment_id);
    await updateDelivery(initial.id, status, {
      status: "complete", comment_reply_id: result.id, comment_reply_status: "sent", last_error: null,
    });
  }
}

async function processCommentReply(initial: Delivery) {
  const db = getSupabaseAdminClient();
  if (!db) throw new Error("Supabase service role key is not configured");
  const { data: campaign, error } = await db.from("instagram_dm_campaigns")
    .select("status").eq("id", initial.campaign_id).single();
  if (error || !campaign) throw error || new Error("Campaign is missing");
  if (campaign.status !== "active") {
    await updateCommentReply(initial.id, {
      comment_reply_next_attempt_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    });
    return;
  }
  if (initial.comment_reply_id) {
    await updateCommentReply(initial.id, { comment_reply_status: "sent", comment_reply_last_error: null });
    return;
  }
  const result = await replyToComment(initial.comment_id);
  await updateCommentReply(initial.id, {
    comment_reply_status: "sent", comment_reply_id: result.id, comment_reply_last_error: null,
  });
}

async function recordFailure(delivery: Delivery, error: unknown) {
  const attemptCount = delivery.attempt_count + 1;
  const metaError = error instanceof MetaApiError ? error : null;
  const status: DeliveryStatus = metaError?.uncertain || error instanceof DeliveryStateError
    ? "needs_review"
    : metaError && metaError.status >= 400 && metaError.status < 500 && !metaError.retryable
      ? "failed"
      : attemptCount >= 5 ? "failed" : delivery.status;
  const delayMinutes = Math.min(2 ** attemptCount, 30);
  try {
    await updateDelivery(delivery.id, delivery.status, {
      status,
      attempt_count: attemptCount,
      next_attempt_at: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
      last_error: error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
    });
  } catch (updateError) {
    // A successful external send followed by a database outage needs manual reconciliation.
    console.error("Instagram delivery state could not be recorded", delivery.id, updateError);
  }
}

async function recordCommentReplyFailure(delivery: Delivery, error: unknown) {
  const attemptCount = delivery.comment_reply_attempt_count + 1;
  const metaError = error instanceof MetaApiError ? error : null;
  const status: CommentReplyStatus = metaError?.uncertain || error instanceof DeliveryStateError
    ? "needs_review"
    : metaError && metaError.status >= 400 && metaError.status < 500 && !metaError.retryable
      ? "failed"
      : attemptCount >= 5 ? "failed" : "pending";
  try {
    await updateCommentReply(delivery.id, {
      comment_reply_status: status,
      comment_reply_attempt_count: attemptCount,
      comment_reply_next_attempt_at: new Date(Date.now() + Math.min(2 ** attemptCount, 30) * 60_000).toISOString(),
      comment_reply_last_error: error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
    });
  } catch (updateError) {
    // A successful Meta reply followed by a database outage must not be retried blindly.
    console.error("Instagram comment reply state could not be recorded", delivery.id, updateError);
  }
}

export async function runInstagramDmWorker() {
  const db = getSupabaseAdminClient();
  if (!db) throw new Error("Supabase service role key is not configured");
  const { data, error } = await db.rpc("claim_instagram_dm_deliveries", { batch_size: 3 });
  if (error) throw error;
  const deliveries = (data || []) as Delivery[];
  await Promise.all(deliveries.map(async (delivery) => {
    try {
      await processDelivery(delivery);
    } catch (failure) {
      console.error("Instagram delivery failed", delivery.id, failure);
      await recordFailure(delivery, failure);
    }
  }));
  const { data: replyData, error: replyError } = await db.rpc("claim_instagram_dm_comment_replies", { batch_size: 3 });
  if (replyError) throw replyError;
  const replies = (replyData || []) as Delivery[];
  await Promise.all(replies.map(async (delivery) => {
    try {
      await processCommentReply(delivery);
    } catch (failure) {
      console.error("Instagram comment reply failed", delivery.id, failure);
      await recordCommentReplyFailure(delivery, failure);
    }
  }));
  return deliveries.length + replies.length;
}
