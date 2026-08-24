import assert from "node:assert/strict";
import test from "node:test";
import { normalizeRakutenRoomUrl } from "./rakuten-room-url";

test("楽天ROOM URLを正規化する", () => {
  assert.equal(
    normalizeRakutenRoomUrl(" https://room.rakuten.co.jp/room_example/items#top "),
    "https://room.rakuten.co.jp/room_example/items",
  );
  assert.equal(normalizeRakutenRoomUrl("   "), "");
});

test("楽天ROOM以外のURLを拒否する", () => {
  assert.throws(
    () => normalizeRakutenRoomUrl("https://example.com/"),
    /room\.rakuten\.co\.jp/,
  );
  assert.throws(
    () => normalizeRakutenRoomUrl("http://room.rakuten.co.jp/room_example"),
    /room\.rakuten\.co\.jp/,
  );
});
