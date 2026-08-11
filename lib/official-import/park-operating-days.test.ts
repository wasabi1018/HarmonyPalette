import assert from "node:assert/strict";
import test from "node:test";
import { normalizeParkOperatingDay } from "@/lib/official-import/park-operating-days";

const sourceUrl = "https://www.harmonyland.jp/wp/?mc-api=json&from=2026-09-01&to=2026-09-30";

test("営業日の開園・閉園時刻をHH:mmに正規化する", () => {
  const result = normalizeParkOperatingDay("2026-09-01", [{
    category_name: "pdf",
    event_title: "2026/9/1 10時開園17時閉園",
    event_time: "10:00:00",
    event_endtime: "17:00:00",
    event_link: "",
  }], sourceUrl);

  assert.equal(result.operatingStatus, "open");
  assert.equal(result.openingTime, "10:00");
  assert.equal(result.closingTime, "17:00");
  assert.equal(result.verificationStatus, "verified");
});

test("休園日の番兵時刻を営業時間として保持しない", () => {
  const result = normalizeParkOperatingDay("2026-09-02", [{
    category_name: "休園日",
    event_title: "2026/9/2 休園日",
    event_time: "00:00:00",
    event_endtime: "23:59:59",
  }], sourceUrl);

  assert.equal(result.operatingStatus, "closed");
  assert.equal(result.openingTime, undefined);
  assert.equal(result.closingTime, undefined);
  assert.equal(result.verificationStatus, "verified");
});

test("営業日と休園日が競合する場合は確認対象にする", () => {
  const result = normalizeParkOperatingDay("2026-09-03", [
    { category_name: "休園日", event_title: "休園日" },
    { category_name: "pdf", event_time: "10:00:00", event_endtime: "17:00:00" },
  ], sourceUrl);

  assert.equal(result.operatingStatus, "unknown");
  assert.equal(result.verificationStatus, "needs-review");
  assert.match(result.notes, /同じ日/);
});

test("時刻も休園日もない場合は休園日と推測しない", () => {
  const result = normalizeParkOperatingDay("2026-09-04", [{ category_name: "pdf" }], sourceUrl);

  assert.equal(result.operatingStatus, "unknown");
  assert.equal(result.verificationStatus, "needs-review");
});
