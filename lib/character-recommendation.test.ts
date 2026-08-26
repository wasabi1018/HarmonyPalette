import assert from "node:assert/strict";
import test from "node:test";
import type { Character } from "@/data/types";
import {
  buildCharacterRecommendationMessage,
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

test("対象月の登場予定を日別のイベント数と総件数で集計する", () => {
  const result = buildCharacterRecommendations("2026-09", character(), [
    entry("one", "2026-09-03"),
    entry("two", "2026-09-02", { startTime: "11:00" }),
    entry("three", "2026-09-02", { startTime: "14:00" }),
    entry("outside", "2026-10-01"),
    entry("other", "2026-09-01", { characterIds: ["other"], characterNames: ["別キャラ"] }),
  ]);

  assert.deepEqual(result.map((day) => [day.date, day.eventCount, day.count]), [
    ["2026-09-02", 1, 2],
    ["2026-09-03", 1, 1],
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

test("毎日会えるキャラクターに明示的なファンスタジオ予定がある日は補完分を加算しない", () => {
  const result = buildCharacterRecommendations(
    "2026-09",
    character({ isFanStudioRegular: true }),
    [entry("fan-studio", "2026-09-03", {
      title: "シナモロール ファンスタジオグリーティング",
      scheduleType: "ファンスタジオグリーティング",
      location: "ファンスタジオ101号室",
    })],
  );
  const targetDay = result.find((day) => day.date === "2026-09-03");

  assert.equal(targetDay?.count, 1);
  assert.deepEqual(groupRecommendationTitles(targetDay?.appearances ?? []), [
    { title: "ファンスタジオ", count: 1 },
  ]);
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

test("イベント種類数を優先し、次に総件数で順位付けする", () => {
  const days = buildCharacterRecommendations("2026-09", character(), [
    entry("a-one", "2026-09-01", { title: "Event A", startTime: "10:00" }),
    entry("a-two", "2026-09-01", { title: "Event B", startTime: "11:00" }),
    entry("a-three", "2026-09-01", { title: "Event C", startTime: "12:00" }),
    entry("b-one", "2026-09-02", { title: "Event A", startTime: "10:00" }),
    entry("b-two", "2026-09-02", { title: "Event A", startTime: "11:00" }),
    entry("b-three", "2026-09-02", { title: "Event A", startTime: "12:00" }),
    entry("b-four", "2026-09-02", { title: "Event B", startTime: "13:00" }),
    entry("b-five", "2026-09-02", { title: "Event B", startTime: "14:00" }),
    entry("c-one", "2026-09-03", { title: "Event A", startTime: "10:00" }),
    entry("c-two", "2026-09-03", { title: "Event A", startTime: "11:00" }),
    entry("c-three", "2026-09-03", { title: "Event B", startTime: "12:00" }),
    entry("c-four", "2026-09-03", { title: "Event B", startTime: "13:00" }),
  ]);

  assert.deepEqual(days.map((day) => [day.date, day.eventCount, day.count]), [
    ["2026-09-01", 3, 3],
    ["2026-09-02", 2, 5],
    ["2026-09-03", 2, 4],
  ]);
  assert.deepEqual(days.map((_, index) => recommendationRank(days, index)), [1, 2, 3]);
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

test("キャラクター名付きのファンスタジオ予定をファンスタジオへ統合する", () => {
  assert.deepEqual(groupRecommendationTitles([
    {
      key: "regular",
      time: "毎日",
      title: "ファンスタジオ",
      location: "ファンスタジオ",
      isRegularFanStudio: true,
    },
    {
      key: "cinnamon",
      time: "10:00",
      title: "シナモロール ファンスタジオグリーティング",
      location: "ファンスタジオ101号室",
      isRegularFanStudio: false,
    },
    {
      key: "melody",
      time: "11:00",
      title: "マイメロディ　ファンスタジオグリーティング",
      location: "ファンスタジオ102号室",
      isRegularFanStudio: false,
    },
  ]), [
    { title: "ファンスタジオ", count: 3 },
  ]);
});

test("DM文章をおすすめ日と詳細URLだけの簡潔な形式で作成する", () => {
  const detailsUrl = "https://harmonypalette.jp/schedule?character=%E3%82%B7%E3%83%8A%E3%83%A2%E3%83%AD%E3%83%BC%E3%83%AB&from=2026-09-01&to=2026-09-30&view=calendar#schedule-results";
  const message = buildCharacterRecommendationMessage({
    month: "2026-09",
    characterName: "シナモロール",
    days: [
      { date: "2026-09-21", eventCount: 2, count: 3, appearances: [] },
      { date: "2026-09-22", eventCount: 2, count: 3, appearances: [] },
      { date: "2026-09-23", eventCount: 2, count: 2, appearances: [] },
    ],
    detailsUrl,
  });

  assert.equal(message, `シナモロール推しさんへ🩷
9月のおすすめ日は9/21(月)・9/22(火)！
詳しい時間・場所はこちら👇
${detailsUrl}
※掲載予定は変更になる場合があります。お出かけ前に公式サイトの最新情報もご確認ください。`);
});
