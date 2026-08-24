import assert from "node:assert/strict";
import test from "node:test";
import { normalizeNewsEntries } from "@/lib/official-monitor/probe";

test("official news API posts are normalized for update detection", () => {
  const entries = normalizeNewsEntries({
    posts: [
      {
        ID: 21072,
        post_title: " 8/29・30開催 ひじ・きつき魅力フェア ",
        permalink: "/news/21072",
        post_date: "2026.08.21",
        post_status: "publish",
        post_content: "<p>開催内容</p>\n<p>詳細</p>",
      },
      {
        ID: 999,
        post_title: "下書き",
        permalink: "/news/999",
        post_status: "draft",
      },
    ],
  });

  assert.equal(entries.length, 1);
  assert.deepEqual(entries[0], {
    id: "21072",
    title: "8/29・30開催 ひじ・きつき魅力フェア",
    url: "https://www.harmonyland.jp/news/21072",
    publishedAt: "2026.08.21",
    contentSha256: "50eb040252c9fcf7e8862779dc61be0440dc29dc887d2c6e7bd0b5c1f63c094a",
  });
});

test("unexpected news API responses fail instead of replacing the baseline with an empty list", () => {
  assert.throws(() => normalizeNewsEntries({ data: [] }), /APIの形式が変更/);
});
