import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { nextRunAt } from "@/lib/official-monitor/schedule";
import { isNotificationOnlyEvent } from "@/lib/official-monitor/types";

test("next run is calculated in Japan Standard Time", () => {
  assert.equal(nextRunAt("21:00", new Date("2026-08-15T11:00:00.000Z")), "2026-08-15T12:00:00.000Z");
  assert.equal(nextRunAt("21:00", new Date("2026-08-15T13:00:00.000Z")), "2026-08-16T12:00:00.000Z");
});

test("detected schedule changes are notification-only", () => {
  assert.equal(isNotificationOnlyEvent({
    eventType: "source-modified",
    importRunId: null,
    metadata: { notificationOnly: true },
  }), true);
});

test("official monitor runner does not enqueue or persist automatic imports", () => {
  const source = readFileSync("lib/official-monitor/runner.ts", "utf8");
  assert.doesNotMatch(source, /enqueueImportJob|claimNextImportJob|persistImportPreview/);
});
