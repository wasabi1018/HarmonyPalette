import assert from "node:assert/strict";
import test from "node:test";
import { createSemanticDiff } from "@/lib/official-monitor/diff";

test("mutable schedule external keys are matched by stable fields", () => {
  const diffs = createSemanticDiff({
    schedules: [{ id: "old", external_key: "old-key", title: "パレード", location: "ハーモニービレッジ", event_date: "2026-08-20", start_time: "10:00:00" }],
    operations: [],
    operatingDays: [],
  }, {
    schedules: [{ id: "new", external_key: "new-key", title: "パレード", location: "ハーモニービレッジ", event_date: "2026-08-20", start_time: "10:30:00" }],
    operations: [],
    operatingDays: [],
  });
  assert.equal(diffs.length, 1);
  assert.equal(diffs[0].changeType, "modified");
  assert.equal(diffs[0].beforeRecordId, "old");
  assert.deepEqual(diffs[0].fieldChanges.start_time, { before: "10:00:00", after: "10:30:00" });
});

test("missing published rows are reported as removals", () => {
  const diffs = createSemanticDiff({
    schedules: [],
    operations: [{ id: "old", external_key: "operation", operation_date: "2026-08-20", attraction_name: "大観覧車" }],
    operatingDays: [],
  }, { schedules: [], operations: [], operatingDays: [] });
  assert.equal(diffs[0].changeType, "removed");
  assert.equal(diffs[0].entityType, "operation");
});

test("ambiguous stable matches do not create automatic removal candidates", () => {
  const diffs = createSemanticDiff({
    schedules: [
      { id: "old-1", external_key: "one", title: "グリーティング", location: "プラザ", event_date: "2026-08-20", start_time: "10:00" },
      { id: "old-2", external_key: "two", title: "グリーティング", location: "プラザ", event_date: "2026-08-20", start_time: "11:00" },
    ],
    operations: [],
    operatingDays: [],
  }, {
    schedules: [{ id: "new", external_key: "three", title: "グリーティング", location: "プラザ", event_date: "2026-08-20", start_time: "10:30" }],
    operations: [],
    operatingDays: [],
  });
  assert.deepEqual(diffs.map((diff) => diff.changeType), ["uncertain"]);
});
