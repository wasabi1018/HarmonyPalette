import assert from "node:assert/strict";
import test from "node:test";
import { followDecision, matchAsset, parseInstagramEvents, parsePostbackPayload, type Asset } from "./domain";

const kuromi: Asset = {
  id: "kuromi", campaign_id: "one", character_name: "クロミ",
  keywords: ["クロミ", "くろみ"], image_path: "kuromi.png", dm_text: "クロミのランキング",
};
const kitty: Asset = {
  id: "kitty", campaign_id: "one", character_name: "ハローキティ",
  keywords: ["キティ", "ハローキティ"], image_path: "kitty.png", dm_text: "キティのランキング",
};

test("comment keywords select the matching character after NFKC normalization", () => {
  assert.equal(matchAsset("ク ロ ミ", [kuromi, kitty])?.id, "kuromi");
  assert.equal(matchAsset("ﾊﾛｰｷﾃｨ", [kuromi, kitty])?.id, "kitty");
  assert.equal(matchAsset("10月よろしく", [kuromi, kitty]), null);
});

test("ambiguous equal-length keywords are not sent automatically", () => {
  const other = { ...kitty, keywords: ["クロミ"] };
  assert.equal(matchAsset("クロミ", [kuromi, other]), null);
});

test("unknown follow result sends the image, explicit nonfollow waits", () => {
  assert.equal(followDecision("following"), "pending_image");
  assert.equal(followDecision("unknown"), "pending_image");
  assert.equal(followDecision("not_following"), "awaiting_follow");
});

test("comment and button events are parsed from a signed webhook body", () => {
  const events = parseInstagramEvents({
    object: "instagram",
    entry: [{
      changes: [{ field: "comments", value: {
        id: "comment-1", from: { id: "user-1" }, media: { id: "reel-1" }, text: "クロミ",
      } }],
      messaging: [{ sender: { id: "user-1" }, postback: {
        payload: "HPDM:OPEN:123e4567-e89b-12d3-a456-426614174000",
      } }],
    }],
  });
  assert.deepEqual(events, [
    { type: "comment", commentId: "comment-1", commenterId: "user-1", mediaId: "reel-1", text: "クロミ" },
    { type: "postback", senderId: "user-1", action: "OPEN", deliveryId: "123e4567-e89b-12d3-a456-426614174000" },
  ]);
  assert.equal(parsePostbackPayload("HPDM:OPEN:invalid"), null);
});

test("own-account replies and events for another account are ignored", () => {
  const body = { object: "instagram", entry: [{
    id: "our-account",
    changes: [
      { field: "comments", value: { id: "reply", parent_id: "parent", from: { id: "fan" }, media: { id: "reel" }, text: "クロミ" } },
      { field: "comments", value: { id: "own", from: { id: "our-account" }, media: { id: "reel" }, text: "クロミ" } },
    ],
  }] };
  assert.deepEqual(parseInstagramEvents(body, "our-account"), []);
  assert.deepEqual(parseInstagramEvents(body, "different-account"), []);
});

test("a follow-confirmation quick reply resumes the same delivery", () => {
  const events = parseInstagramEvents({ object: "instagram", entry: [{
    id: "our-account",
    messaging: [{ sender: { id: "fan" }, message: {
      quick_reply: { payload: "HPDM:CHECK:123e4567-e89b-12d3-a456-426614174000" },
    } }],
  }] }, "our-account");
  assert.deepEqual(events, [{
    type: "postback", senderId: "fan", action: "CHECK", deliveryId: "123e4567-e89b-12d3-a456-426614174000",
  }]);
});
