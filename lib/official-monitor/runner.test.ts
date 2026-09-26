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
