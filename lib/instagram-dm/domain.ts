export type DeliveryStatus =
  | "pending_intro" | "awaiting_tap" | "pending_check" | "awaiting_follow"
  | "pending_image" | "pending_text" | "pending_reply" | "complete"
  | "failed" | "needs_review";

export type Campaign = {
  id: string;
  month: string;
  reel_media_id: string;
  status: "draft" | "active" | "paused";
};

export type Asset = {
  id: string;
  campaign_id: string;
  character_name: string;
  keywords: string[];
  image_path: string;
  dm_text: string;
};

export type Delivery = {
  id: string;
  campaign_id: string;
  asset_id: string;
  comment_id: string;
  commenter_id: string;
  comment_text: string;
  status: DeliveryStatus;
  follow_status: "following" | "not_following" | "unknown" | null;
  intro_message_id: string | null;
  follow_message_id: string | null;
  image_message_id: string | null;
  text_message_id: string | null;
  comment_reply_id: string | null;
  attempt_count: number;
};

export function followDecision(status: "following" | "not_following" | "unknown") {
  return status === "not_following" ? "awaiting_follow" as const : "pending_image" as const;
}

export function normalizeComment(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("ja-JP").replace(/\s+/g, "");
}

export function matchAsset(comment: string, assets: Asset[]): Asset | null {
  const normalized = normalizeComment(comment);
  const matches = assets.flatMap((asset) => asset.keywords
    .map((keyword) => normalizeComment(keyword))
    .filter((keyword) => keyword && normalized.includes(keyword))
    .map((keyword) => ({ asset, length: keyword.length })));
  if (!matches.length) return null;
  const longest = Math.max(...matches.map((match) => match.length));
  const winners = new Set(matches.filter((match) => match.length === longest).map((match) => match.asset.id));
  return winners.size === 1 ? matches.find((match) => match.length === longest)!.asset : null;
}

export function postbackPayload(action: "OPEN" | "CHECK", deliveryId: string) {
  return `HPDM:${action}:${deliveryId}`;
}

export function parsePostbackPayload(value: unknown) {
  if (typeof value !== "string") return null;
  const match = /^HPDM:(OPEN|CHECK):([0-9a-f]{8}-[0-9a-f-]{27,})$/i.exec(value);
  return match ? { action: match[1] as "OPEN" | "CHECK", deliveryId: match[2] } : null;
}

type RecordLike = Record<string, unknown>;
function record(value: unknown): RecordLike | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordLike : null;
}
function nonemptyString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export type InstagramEvent =
  | { type: "comment"; commentId: string; commenterId: string; mediaId: string; text: string }
  | { type: "postback"; senderId: string; deliveryId: string; action: "OPEN" | "CHECK" };

export function parseInstagramEvents(body: unknown, accountId?: string): InstagramEvent[] {
  const root = record(body);
  if (root?.object !== "instagram" || !Array.isArray(root.entry)) return [];
  const events: InstagramEvent[] = [];
  for (const entryValue of root.entry) {
    const entry = record(entryValue);
    if (!entry) continue;
    if (accountId && entry.id !== accountId) continue;
    const entryTime = typeof entry.time === "number" ? entry.time : null;
    if (entryTime && Date.now() - entryTime * 1000 > 25 * 60 * 60 * 1000) continue;
    for (const changeValue of Array.isArray(entry.changes) ? entry.changes : []) {
      const change = record(changeValue);
      if (change?.field !== "comments") continue;
      const value = record(change.value);
      if (value?.parent_id) continue;
      const commentId = nonemptyString(value?.id);
      const commenterId = nonemptyString(record(value?.from)?.id);
      if (accountId && commenterId === accountId) continue;
      const mediaId = nonemptyString(record(value?.media)?.id);
      const commentText = nonemptyString(value?.text);
      if (commentId && commenterId && mediaId && commentText) {
        events.push({ type: "comment", commentId, commenterId, mediaId, text: commentText });
      }
    }
    for (const messagingValue of Array.isArray(entry.messaging) ? entry.messaging : []) {
      const messaging = record(messagingValue);
      if (record(messaging?.message)?.is_echo === true) continue;
      const senderId = nonemptyString(record(messaging?.sender)?.id);
      if (accountId && senderId === accountId) continue;
      const payload = parsePostbackPayload(
        record(record(messaging?.message)?.quick_reply)?.payload ?? record(messaging?.postback)?.payload,
      );
      if (senderId && payload) events.push({ type: "postback", senderId, ...payload });
    }
  }
  return events;
}
