import assert from "node:assert/strict";
import test from "node:test";
import type { Character } from "@/data/types";
import {
  buildCharacterRecommendations,
  groupRecommendationTitles,
  recommendationRank,
} from "@/lib/character-recommendation";
import type { ScheduleEntry } from "@/lib/schedule-store";

function character(overrides: Partial<Character> = {}): Character {
  return {
    id: "cinnamon",
    slug: "cinnamon",
    name: "シナモン",
    nameKana: "しなもん",
    image: "",
    description: "",
    officialUrl: "",
    isFanStudioRegular: false,
    themeColor: "#68acd3",
    birthdayMonth: null,
    birthdayDay: null,
    ...overrides,
  };
}

function entry(id: string, date: string, overrides: Partial<ScheduleEntry> = {}): ScheduleEntry {
  return {
    id,
    kind: "greeting",
    title: "グリーティング",
    date,
    startTime: "10:00",
    characterIds: ["cinnamon"],
    characterNames: ["シナモン"],
    scheduleType: "グリーティング",
    location: "プラザ",
    description: "",
    officialUrl: "",
    sourceName: "テスト",
    updatedAt: "2026-08-26T00:00:00.000Z",
    status: "upcoming",
    isSample: false,
    ...overrides,
  };
}

test("対象月の登場予定を日別件数の多い順に集計する", () => {
  const result = buildCharacterRecommendations("2026-09", character(), [
    entry("one", "2026-09-03"),
    entry("two", "2026-09-02", { startTime: "11:00" }),
    entry("three", "2026-09-02", { startTime: "14:00" }),
    entry("outside", "2026-10-01"),
    entry("other", "2026-09-01", { characterIds: ["other"], characterNames: ["別キャラ"] }),
  ]);

  assert.deepEqual(result.map((day) => [day.date, day.count]), [
    ["2026-09-02", 2],
    ["2026-09-03", 1],
  ]);
});

test("期間予定を各日に展開し、休園日と重複予定を除外する", () => {
  const repeated = entry("range", "2026-09-01", { endDate: "2026-09-03" });
  const duplicate = { ...repeated };
  const result = buildCharacterRecommendations(
    "2026-09",
    character(),
    [repeated, duplicate],
    new Set(["2026-09-02"]),
  );

  assert.deepEqual(result.map((day) => [day.date, day.count]), [
    ["2026-09-01", 1],
    ["2026-09-03", 1],
  ]);
});

test("毎日会えるキャラクターは休園日以外にファンスタジオを1件加える", () => {
  const result = buildCharacterRecommendations(
    "2026-09",
    character({ isFanStudioRegular: true }),
    [entry("extra", "2026-09-03")],
    new Set(["2026-09-02"]),
  );

  assert.equal(result.find((day) => day.date === "2026-09-03")?.count, 2);
  assert.equal(result.some((day) => day.date === "2026-09-02"), false);
  assert.equal(result.find((day) => day.date === "2026-09-01")?.appearances[0].isRegularFanStudio, true);
});

test("同数の日は同順位として扱う", () => {
  const days = buildCharacterRecommendations("2026-09", character(), [
    entry("one", "2026-09-01"),
    entry("two", "2026-09-02"),
    entry("three", "2026-09-03"),
    entry("four", "2026-09-03", { startTime: "14:00" }),
  ]);

  assert.deepEqual(days.map((_, index) => recommendationRank(days, index)), [1, 2, 2]);
});

test("同じタイトルの予定を出現順のまま件数へまとめる", () => {
  const days = buildCharacterRecommendations("2026-09", character(), [
    entry("one", "2026-09-12", { title: "お出迎えグリーティング", startTime: "10:00" }),
    entry("two", "2026-09-12", { title: "ハイタッチグリーティング", startTime: "12:00" }),
    entry("three", "2026-09-12", { title: "お出迎えグリーティング", startTime: "15:00" }),
  ]);

  assert.deepEqual(groupRecommendationTitles(days[0].appearances), [
    { title: "お出迎えグリーティング", count: 2 },
    { title: "ハイタッチグリーティング", count: 1 },
  ]);
});
