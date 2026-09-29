import assert from "node:assert/strict";
import test from "node:test";
import {
  currentJapanDate,
  hashDailyVisitorToken,
  isValidDailyVisitorToken,
} from "./unique-visitor";

const TOKEN = "f4ef6df6-0615-4f4c-9f9b-3ef5ed6ba5dc";

test("UUID v4だけを日次訪問トークンとして受け付ける", () => {
  assert.equal(isValidDailyVisitorToken(TOKEN), true);
  assert.equal(isValidDailyVisitorToken("f4ef6df6-0615-1f4c-9f9b-3ef5ed6ba5dc"), false);
  assert.equal(isValidDailyVisitorToken("not-a-uuid"), false);
  assert.equal(isValidDailyVisitorToken(null), false);
});

test("サーバーでも日本時間の日付境界を使う", () => {
  assert.equal(currentJapanDate(new Date("2026-09-29T14:59:59Z")), "2026-09-29");
  assert.equal(currentJapanDate(new Date("2026-09-29T15:00:00Z")), "2026-09-30");
});

test("ハッシュは同じ日だけ安定し、日付が変わると変化する", () => {
  const first = hashDailyVisitorToken(TOKEN, "2026-09-29");
  const repeated = hashDailyVisitorToken(TOKEN, "2026-09-29");
  const nextDay = hashDailyVisitorToken(TOKEN, "2026-09-30");

  assert.match(first, /^[0-9a-f]{64}$/);
  assert.equal(repeated, first);
  assert.notEqual(nextDay, first);
});
