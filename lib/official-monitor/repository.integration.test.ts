import assert from "node:assert/strict";
import { before, beforeEach, mock, test } from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

let row: Record<string, unknown>;
const client = {
  from: (table: string) => {
    assert.equal(table, "official_monitor_settings");
    return {
      select: () => ({ eq: () => ({ single: async () => ({ data: { ...row }, error: null }) }) }),
      update: (patch: Record<string, unknown>) => ({ eq: async () => { Object.assign(row, patch); return { error: null }; } }),
    };
  },
};
mock.module("server-only", { defaultExport: {} });
mock.module(pathToFileURL(resolve(__dirname, "../supabase/server.ts")), { namedExports: { getSupabaseAdminClient: () => client } });
let repository: typeof import("./repository");
before(async () => { repository = await import("./repository"); });
beforeEach(() => {
  row = { id: true, enabled: true, scheduled_time: "17:00:00", next_run_at: "2026-11-25T08:00:00.000Z", consecutive_failures: 0 };
});

test("monitor errors make the next Cron tick due and successful retries restore daily scheduling", async () => {
  await repository.markMonitorFinished("upstream unavailable", new Date("2026-11-24T17:01:00+09:00"));
  assert.equal(row.next_run_at, "2026-11-24T08:15:00.000Z");
  assert.equal(row.last_error, "upstream unavailable");
  assert.equal(row.consecutive_failures, 1);
  await repository.markMonitorStarted("2026-11-25T08:00:00.000Z");
  await repository.markMonitorFinished(undefined, new Date("2026-11-24T17:16:00+09:00"));
  assert.equal(row.next_run_at, "2026-11-25T08:00:00.000Z");
  assert.equal(row.last_succeeded_at, "2026-11-24T08:16:00.000Z");
  assert.equal(row.last_error, null);
  assert.equal(row.consecutive_failures, 0);
});

test("persistent failures stop retrying after the scheduled retry window", async () => {
  await repository.markMonitorFinished("failure", new Date("2026-11-24T17:16:00+09:00"));
  assert.equal(row.next_run_at, "2026-11-24T08:30:00.000Z");
  await repository.markMonitorFinished("failure", new Date("2026-11-24T17:31:00+09:00"));
  assert.equal(row.next_run_at, "2026-11-25T08:00:00.000Z");
  assert.equal(row.consecutive_failures, 2);
});

test("admin time changes stay in the settings row and reset the dispatch gate", async () => {
  const result = await repository.updateOfficialMonitorSettings({ enabled: true, scheduledTime: "18:15", lookaheadDays: 31, retentionDays: 45, maxStorageBytes: 157286400 });
  assert.equal(result.scheduledTime, "18:15");
  assert.equal(result.nextRunAt, null);
  assert.equal(row.scheduled_time, "18:15:00");
});
