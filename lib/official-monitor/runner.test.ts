import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { nextMonitorRetryAt, nextRunAt } from "@/lib/official-monitor/schedule";
import { isNotificationOnlyEvent } from "@/lib/official-monitor/types";

test("next run is calculated in Japan Standard Time", () => {
  assert.equal(nextRunAt("21:00", new Date("2026-08-15T11:00:00.000Z")), "2026-08-15T12:00:00.000Z");
  assert.equal(nextRunAt("21:00", new Date("2026-08-15T13:00:00.000Z")), "2026-08-16T12:00:00.000Z");
});

test("failed daily checks retry on the next two Cron ticks then wait for the next day", () => {
  assert.equal(nextMonitorRetryAt("17:00", new Date("2026-11-24T17:01:00+09:00")), "2026-11-24T08:15:00.000Z");
  assert.equal(nextMonitorRetryAt("17:00", new Date("2026-11-24T17:16:00+09:00")), "2026-11-24T08:30:00.000Z");
  assert.equal(nextMonitorRetryAt("17:00", new Date("2026-11-24T17:31:00+09:00")), "2026-11-25T08:00:00.000Z");
  assert.equal(nextMonitorRetryAt("17:00", new Date("2026-11-24T10:00:00+09:00")), "2026-11-24T08:00:00.000Z");
});

test("retry slots follow edited settings and cross midnight without an extra daily run", () => {
  assert.equal(nextMonitorRetryAt("18:00", new Date("2026-11-24T18:01:00+09:00")), "2026-11-24T09:15:00.000Z");
  assert.equal(nextMonitorRetryAt("23:45", new Date("2026-11-25T00:01:00+09:00")), "2026-11-24T15:15:00.000Z");
  assert.equal(nextMonitorRetryAt("23:45", new Date("2026-11-25T00:16:00+09:00")), "2026-11-25T14:45:00.000Z");
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
  assert.doesNotMatch(source, /importFanStudioSchedules|harmonyland-funstudio/);
  assert.match(source, /if \(diffs\.length === 0\) continue/);
  assert.match(source, /sourceKey: "official-site"/);
  assert.match(source, /buildOfficialUpdateSummary\(sections\)/);
});

test("official monitor does not fetch or bundle Fan Studio OCR assets", () => {
  const probe = readFileSync("lib/official-monitor/probe.ts", "utf8");
  const calendarImporter = readFileSync("lib/official-import/harmonyland.ts", "utf8");
  const source = readFileSync("next.config.mjs", "utf8");
  assert.doesNotMatch(probe, /FUN_STUDIO_URL|sourceKey:\s*"funstudio"/);
  assert.doesNotMatch(calendarImporter, /funstudio|includeFanStudio/i);
  assert.match(source, /\.\/node_modules\/tesseract\.js-core\/\*\.wasm/);
  assert.doesNotMatch(source, /"\/api\/cron\/official-updates": tesseractRuntimeAssets/);
});
