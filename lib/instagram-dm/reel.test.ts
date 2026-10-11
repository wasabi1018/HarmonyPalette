import assert from "node:assert/strict";
import test from "node:test";
import { findInstagramReelMedia, isInstagramReelUrl } from "./reel";

const reelUrl = "https://www.instagram.com/reel/DdvxWgFPWLp/?utm_source=ig_web_copy_link&xtok=example";

test("accepts an Instagram Reel share URL and rejects other hosts or paths", () => {
  assert.equal(isInstagramReelUrl(reelUrl), true);
  assert.equal(isInstagramReelUrl("https://instagram.com/reel/DdvxWgFPWLp/"), true);
  assert.equal(isInstagramReelUrl("https://instagram.com.evil.example/reel/DdvxWgFPWLp/"), false);
  assert.equal(isInstagramReelUrl("https://www.instagram.com/p/DdvxWgFPWLp/"), false);
  assert.equal(isInstagramReelUrl("http://www.instagram.com/reel/DdvxWgFPWLp/"), false);
  assert.equal(isInstagramReelUrl("https://user@www.instagram.com/reel/DdvxWgFPWLp/"), false);
});

test("finds the Meta media ID by matching the Reel permalink across pages", async () => {
  const cursors: Array<string | undefined> = [];
  const result = await findInstagramReelMedia(reelUrl, async (after) => {
    cursors.push(after);
    return after ? {
      data: [{ id: "17841234567890123", permalink: "https://www.instagram.com/reel/DdvxWgFPWLp/" }],
    } : {
      data: [{ id: "17840000000000000", permalink: "https://www.instagram.com/reel/AnotherPost/" }],
      paging: { next: "https://graph.instagram.com/next", cursors: { after: "page-2" } },
    };
  });
  assert.deepEqual(cursors, [undefined, "page-2"]);
  assert.deepEqual(result, {
    status: "found", id: "17841234567890123", permalink: "https://www.instagram.com/reel/DdvxWgFPWLp/",
  });
});

test("does not invent a media ID for an unrelated or missing Reel", async () => {
  assert.deepEqual(await findInstagramReelMedia(reelUrl, async () => ({
    data: [{ id: "17840000000000000", permalink: "https://www.instagram.com/reel/AnotherPost/" }],
  })), { status: "not_found" });
  assert.deepEqual(await findInstagramReelMedia("https://example.com/reel/DdvxWgFPWLp/", async () => {
    throw new Error("must not load media for an invalid URL");
  }), { status: "invalid_url" });
});

test("rejects a malformed or repeating pagination response", async () => {
  assert.deepEqual(await findInstagramReelMedia(reelUrl, async () => ({})), { status: "invalid_response" });
  assert.deepEqual(await findInstagramReelMedia(reelUrl, async () => ({
    data: [], paging: { next: "https://graph.instagram.com/next", cursors: { after: "same" } },
  })), { status: "invalid_response" });
});

test("stops after a bounded number of Meta media pages", async () => {
  let requests = 0;
  const result = await findInstagramReelMedia(reelUrl, async () => {
    requests += 1;
    return { data: [], paging: { next: "https://graph.instagram.com/next", cursors: { after: String(requests) } } };
  });
  assert.deepEqual(result, { status: "limit_reached" });
  assert.equal(requests, 50);
});
