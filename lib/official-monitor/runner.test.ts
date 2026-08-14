import assert from "node:assert/strict";
import test from "node:test";
import { nextRunAt } from "@/lib/official-monitor/schedule";

test("next run is calculated in Japan Standard Time", () => {
  assert.equal(nextRunAt("21:00", new Date("2026-08-15T11:00:00.000Z")), "2026-08-15T12:00:00.000Z");
  assert.equal(nextRunAt("21:00", new Date("2026-08-15T13:00:00.000Z")), "2026-08-16T12:00:00.000Z");
});
