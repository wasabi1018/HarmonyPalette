import assert from "node:assert/strict";
import { test } from "node:test";
import { getHomepageTodayStatus } from "./homepage-today-status";
import type { ScheduleEntry } from "./schedule-store";
import type { ParkOperatingDay } from "./park-operating-day-store";

const entry: ScheduleEntry = { id: "test", kind: "event", title: "テスト公演", date: "2026-10-05", startTime: "12:00", endTime: "12:30", characterIds: [], scheduleType: "ショー", location: "広場", description: "", officialUrl: "", sourceName: "", updatedAt: "", status: "upcoming", isSample: false };
const base = { today: "2026-10-05", currentTime: "11:00", entries: [entry], loadStatus: "success" as const, clockReady: true };
const openDay: ParkOperatingDay = { id: "test", date: base.today, operatingStatus: "open", openingTime: "10:00", closingTime: "17:00", sourceTitle: "", notes: "", officialUrl: "", updatedAt: "" };

test("known schedules transition through next, ongoing, and ended", () => {
  assert.equal(getHomepageTodayStatus(base).kind, "next");
  assert.equal(getHomepageTodayStatus({ ...base, currentTime: "12:15" }).kind, "ongoing");
  assert.equal(getHomepageTodayStatus({ ...base, currentTime: "12:30" }).kind, "ended");
});

test("missing data and failures are never treated as closure or completion", () => {
  assert.equal(getHomepageTodayStatus({ ...base, entries: [] }).kind, "empty");
  assert.equal(getHomepageTodayStatus({ ...base, entries: [], loadStatus: "error" }).kind, "error");
  assert.equal(getHomepageTodayStatus({ ...base, entries: [], loadStatus: "unavailable" }).kind, "error");
  assert.equal(getHomepageTodayStatus({ ...base, currentTime: "20:00", entries: [{ ...entry, endTime: undefined }] }).kind, "ready");
  assert.equal(getHomepageTodayStatus({ ...base, clockReady: false }).kind, "ready");
});

test("confirmed operating data distinguishes a closed day from the end of published schedules", () => {
  assert.equal(getHomepageTodayStatus({ ...base, operatingDay: { ...openDay, operatingStatus: "closed" } }).kind, "closed");
  assert.equal(getHomepageTodayStatus({ ...base, currentTime: "18:00", entries: [{ ...entry, endTime: undefined }], operatingDay: openDay }).kind, "ended");
  assert.equal(getHomepageTodayStatus({ ...base, currentTime: "18:00", entries: [{ ...entry, endTime: undefined }], operatingDay: { ...openDay, operatingStatus: "unknown" } }).kind, "ready");
});
