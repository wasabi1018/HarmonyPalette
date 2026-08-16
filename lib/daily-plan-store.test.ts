import assert from "node:assert/strict";
import test from "node:test";
import {
  reconcileOfficialPlanItems,
  type DailyPlan,
  type DailyPlanItem,
} from "@/lib/daily-plan-store";
import type { ScheduleEntry } from "@/lib/schedule-store";

const date = "2026-08-17";

function officialPlanItem(overrides: Partial<DailyPlanItem> = {}): DailyPlanItem {
  return {
    id: "official:plan-item",
    kind: "official",
    sourceScheduleId: "supabase:old",
    title: "クロミ ファンスタジオグリーティング",
    characterNames: ["クロミ"],
    scheduleType: "グリーティング",
    startTime: "11:00",
    endTime: "11:20",
    location: "ファンスタジオ101号室",
    note: "先にショップへ寄る",
    timeLocked: true,
    createdAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function planWith(item: DailyPlanItem): Record<string, DailyPlan> {
  return {
    [date]: {
      date,
      items: [item],
      updatedAt: "2026-08-01T00:00:00.000Z",
    },
  };
}

function fanStudioEntry(overrides: Partial<ScheduleEntry> = {}): ScheduleEntry {
  return {
    id: "supabase:new",
    externalKey: "2026-08-17:ファンスタジオ101号室:11:00",
    kind: "greeting",
    title: "あひるのペックル ファンスタジオグリーティング",
    date,
    startTime: "11:00",
    endTime: "11:20",
    characterIds: [],
    characterNames: ["あひるのペックル"],
    scheduleType: "グリーティング",
    location: "ファンスタジオ101号室",
    description: "",
    officialUrl: "https://www.harmonyland.jp/",
    sourceName: "ハーモニーランド公式・ファンスタジオ",
    sourceId: "harmonyland-funstudio",
    updatedAt: "2026-08-17T00:00:00.000Z",
    status: "upcoming",
    isSample: false,
    isImported: true,
    ...overrides,
  };
}

function generalScheduleEntry(overrides: Partial<ScheduleEntry> = {}): ScheduleEntry {
  return {
    id: "supabase:iceful-current",
    externalKey: "2026-08-17:iceful-parade:13:00",
    kind: "event",
    title: "Iceful Parade アイスフルパレード",
    date,
    startTime: "13:00",
    endTime: "13:25",
    characterIds: [],
    characterNames: ["ハローキティ"],
    scheduleType: "ショー・パレード",
    location: "ハーモニービレッジ",
    description: "",
    officialUrl: "https://www.harmonyland.jp/",
    sourceName: "ハーモニーランド公式 日別PDF",
    sourceId: "harmonyland-daily-pdf",
    updatedAt: "2026-08-17T00:00:00.000Z",
    status: "upcoming",
    isSample: false,
    isImported: true,
    ...overrides,
  };
}

test("旧IDのファンスタジオ予定を同じ枠の最新キャラクターへ同期する", () => {
  const result = reconcileOfficialPlanItems(planWith(officialPlanItem()), [fanStudioEntry()], "2026-08-17T01:00:00.000Z");
  const item = result.plans[date].items[0];
  assert.equal(result.updatedCount, 1);
  assert.equal(item.sourceScheduleId, "supabase:new");
  assert.deepEqual(item.characterNames, ["あひるのペックル"]);
  assert.equal(item.note, "先にショップへ寄る");
  assert.equal(item.syncStatus, "updated");
});

test("公式予定が見つからなくても既存プランを削除しない", () => {
  const result = reconcileOfficialPlanItems(planWith(officialPlanItem()), [], "2026-08-17T01:00:00.000Z");
  const item = result.plans[date].items[0];
  assert.equal(result.missingCount, 1);
  assert.equal(item.title, "クロミ ファンスタジオグリーティング");
  assert.equal(item.syncStatus, "missing");
});

test("同じ枠に複数候補がある場合は自動更新しない", () => {
  const entries = [fanStudioEntry(), fanStudioEntry({ id: "supabase:another", characterNames: ["クロミ"] })];
  const result = reconcileOfficialPlanItems(planWith(officialPlanItem()), entries, "2026-08-17T01:00:00.000Z");
  const item = result.plans[date].items[0];
  assert.equal(result.reviewCount, 1);
  assert.deepEqual(item.characterNames, ["クロミ"]);
  assert.equal(item.syncStatus, "needs-review");
});

test("旧IDの一般イベントを内容が一致する公開予定へ移行する", () => {
  const oldItem = officialPlanItem({
    sourceScheduleId: "legacy:iceful",
    title: "Iceful Parade アイスフルパレード",
    characterNames: ["ハローキティ"],
    scheduleType: "ショー・パレード",
    startTime: "13:00",
    endTime: "13:25",
    location: "ハーモニービレッジ",
    syncStatus: "missing",
  });
  const result = reconcileOfficialPlanItems(planWith(oldItem), [generalScheduleEntry()], "2026-08-17T01:00:00.000Z");
  const item = result.plans[date].items[0];
  assert.equal(result.updatedCount, 0);
  assert.equal(result.missingCount, 0);
  assert.equal(item.sourceScheduleId, "supabase:iceful-current");
  assert.equal(item.sourceScheduleKey, "harmonyland-daily-pdf:2026-08-17:iceful-parade:13:00");
  assert.equal(item.syncStatus, "current");
});

test("識別キーのない一般イベントは一致候補がなくても未公開扱いにしない", () => {
  const oldItem = officialPlanItem({
    sourceScheduleId: "legacy:splash-party",
    title: "南の島の！？はちゃめちゃスプラッシュパーリー！",
    characterNames: [],
    scheduleType: "ステージイベント",
    startTime: "11:45",
    endTime: "12:00",
    location: "ハーモニーパーク",
    syncStatus: "missing",
  });
  const result = reconcileOfficialPlanItems(planWith(oldItem), [], "2026-08-17T01:00:00.000Z");
  const item = result.plans[date].items[0];
  assert.equal(result.missingCount, 0);
  assert.equal(item.syncStatus, "current");
});

test("識別キーを保存済みの一般イベントが消えた場合は未公開扱いにする", () => {
  const itemWithKey = officialPlanItem({
    title: "Iceful Parade アイスフルパレード",
    location: "ハーモニービレッジ",
    sourceScheduleKey: "harmonyland-daily-pdf:2026-08-17:iceful-parade:13:00",
  });
  const result = reconcileOfficialPlanItems(planWith(itemWithKey), [], "2026-08-17T01:00:00.000Z");
  assert.equal(result.missingCount, 1);
  assert.equal(result.plans[date].items[0].syncStatus, "missing");
});

test("カスタム予定は同期対象にしない", () => {
  const custom = officialPlanItem({ id: "custom:item", kind: "custom", timeLocked: false });
  const result = reconcileOfficialPlanItems(planWith(custom), [fanStudioEntry()], "2026-08-17T01:00:00.000Z");
  assert.equal(result.changed, false);
  assert.equal(result.plans[date].items[0], custom);
});

test("取得範囲より古いプランは未公開扱いにしない", () => {
  const oldDate = "2026-06-01";
  const oldPlan: Record<string, DailyPlan> = {
    [oldDate]: {
      date: oldDate,
      items: [officialPlanItem()],
      updatedAt: "2026-06-01T00:00:00.000Z",
    },
  };
  const result = reconcileOfficialPlanItems(oldPlan, [], "2026-08-17T01:00:00.000Z", "2026-07-17");
  assert.equal(result.changed, false);
  assert.equal(result.missingCount, 0);
  assert.equal(result.plans[oldDate], oldPlan[oldDate]);
});
