import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ParkOperatingInfo } from "@/components/park-operating-info";
import type { ParkOperatingDay } from "@/lib/park-operating-day-store";

const baseDay: ParkOperatingDay = {
  id: "operating-day",
  date: "2026-08-11",
  operatingStatus: "open",
  openingTime: "10:00",
  closingTime: "17:00",
  sourceTitle: "公式カレンダー",
  notes: "",
  officialUrl: "https://www.harmonyland.jp/event#calendar",
  updatedAt: "2026-08-11T00:00:00.000Z",
};

function render(days: ParkOperatingDay[], date = baseDay.date) {
  return renderToStaticMarkup(<ParkOperatingInfo date={date} operatingDays={days} />);
}

test("選択日の営業時間を表示する", () => {
  const html = render([baseDay]);
  assert.match(html, /営業時間/);
  assert.match(html, /10:00–17:00/);
});

test("休園日は休園日と表示する", () => {
  const html = render([{ ...baseDay, operatingStatus: "closed", openingTime: undefined, closingTime: undefined }]);
  assert.match(html, /休園日/);
  assert.doesNotMatch(html, /営業時間/);
});

test("未取得と確認待ちは何も表示しない", () => {
  assert.equal(render([], "2099-01-01"), "");
  assert.equal(render([{ ...baseDay, operatingStatus: "unknown", openingTime: undefined, closingTime: undefined }]), "");
});
