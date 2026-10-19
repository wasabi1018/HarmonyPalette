import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  calculate,
  DEFAULT_CONFIG,
  emptyState,
  holidayPoints,
  levelFor,
  mergeForUpdate,
  projectPublic,
  pruneState,
  validateConfig,
} from "./model";
import {
  bulletinUrls,
  classifyWeather,
  mergeWeather,
  parseBulletin,
} from "./weather";
import type { DayInput, Weather } from "./types";
import { displayedScore } from "./score";
import { forecastMonth, placeholderDay, topicsFor } from "./presentation";
const now = new Date("2026-10-18T19:00:00+09:00");
const input = (date = "2026-10-19"): DayInput => ({
  date,
  status: "open",
  opening: "10:00",
  closing: "17:00",
  schedule: "published",
  fan: "published",
  slots: 22,
  rooms: [101, 102],
  baselineDensities: [],
  birthdays: [],
});
const config = () => structuredClone(DEFAULT_CONFIG);
test("画像と公開カレンダーは保存済みの混雑・天気・トピックスを共用し、6週と欠損も扱う", () => {
  const state = emptyState();
  const saved = calculate({ ...input("2026-10-31"), closing: "21:00", rooms: [101, 102, 103], slots: 33,
    birthdays: [{ id: "kuromi", name: "クロミ" }] }, config(), state.holidays, null, now);
  state.days[saved.input.date] = saved;
  const published = projectPublic(state, now);
  const before = structuredClone(published);
  const month = forecastMonth(published, "2026-10");
  assert.equal(month.byDate.get("2026-10-31"), published.days[0]);
  assert.deepEqual(topicsFor(published.days[0]).map((topic) => topic.text),
    ["ファンスタ3部屋", "ナイト営業日", "クロミ誕生日"]);
  assert.equal(placeholderDay("2026-10-30").level, "pending");
  assert.equal(month.ready, false);
  assert.equal(forecastMonth({ ...published, months: ["2026-08"] }, "2026-08").cells.length, 42);
  assert.throws(() => forecastMonth(published, "2026-09"));
  assert.deepEqual(published, before);
});
test("画像の公開状況も連続する未公開日をまとめ、休園日と別状態を区別する", () => {
  const state = emptyState();
  for (const date of ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-30"]) {
    state.days[date] = calculate({ ...input(date), schedule: "unpublished",
      status: date.endsWith("28") ? "closed" : "open" }, config(), state.holidays, null, now);
  }
  const month = forecastMonth(projectPublic(state, now), "2026-10");
  assert.equal(month.notices.find((notice) => notice.key === "schedule-unpublished")?.dates,
    "10/26～10/27、10/30");
});
const weather = (kind: Weather["kind"] = "rain"): Weather => ({
  date: "2026-10-19",
  kind,
  text: "雨",
  region: "大分県 中部",
  station: "大分",
  high: 24,
  low: 17,
  rain: [
    { from: 6, to: 12, probability: 20 },
    { from: 12, to: 18, probability: 30 },
  ],
  dailyRain: null,
  issuedAt: "2026-10-18T17:00:00+09:00",
  fetchedAt: now.toISOString(),
  validUntil: "2026-10-20T05:00:00Z",
  sourceUrl: "https://example.test",
});

test("混雑レベルは25・50・70・90の境界で切り替わる", () => {
  assert.deepEqual(
    [0, 24, 25, 49, 50, 69, 70, 89, 90, 100].map((n) => levelFor(n, config())),
    [
      "quiet",
      "quiet",
      "normal",
      "normal",
      "moderate",
      "moderate",
      "busy",
      "busy",
      "veryBusy",
      "veryBusy",
    ],
  );
});
test("営業が確定し予定が未公開の日は、未反映の情報を明示する基本予想", () => {
  const d = calculate(
    { ...input(), fan: "unpublished" },
    config(),
    {},
    null,
    now,
  );
  assert.equal(d.level, "normal");
  assert.equal(d.provisional, true);
  assert.equal(d.threeRooms, false);
  const s = emptyState();
  s.days[d.input.date] = d;
  assert.equal(projectPublic(s, now).days[0].provisional, true);
  assert.equal(
    calculate({ ...input(), status: "unknown" }, config(), {}, null, now).level,
    "pending",
  );
});
test("通常平日25、土日祝の前後の平日は基準30", () => {
  const s = emptyState();
  assert.equal(
    calculate(input("2026-10-20"), config(), s.holidays, null, now).breakdown.weekday,
    25,
  );
  assert.equal(calculate(input(), config(), s.holidays, null, now).breakdown.weekday, 30);
});
test("100点を超える合計も天気補正後の点数で保持し、90点以上は大混雑", () => {
  const d = calculate(
    {
      ...input("2026-10-31"),
      closing: "21:00",
      birthdays: [{ id: "kuromi", name: "クロミ" }],
    },
    config(),
    {},
    null,
    now,
  );
  assert.equal(d.score, 110);
  assert.equal(d.raw, 110);
  assert.equal(d.level, "veryBusy");
  assert.equal(d.fallbackLevel, "veryBusy");

  const c = config();
  c.weekday.adjacent = 100;
  const rainy = calculate(
    {
      ...input(),
      closing: "21:00",
      birthdays: [{ id: "kuromi", name: "クロミ" }],
    },
    c,
    {},
    weather(),
    now,
  );
  assert.equal(rainy.score, 120);
  assert.equal(rainy.factor, 0.8);
  const state = emptyState();
  state.days[d.input.date] = d;
  const publicDay = projectPublic(state, now).days[0];
  assert.equal(publicDay.level, "veryBusy");
  assert.doesNotMatch(JSON.stringify(publicDay), /score|raw|breakdown|factor/);
});
test("保存済みの100点上限の予想も書き換えずに丸め前の値から表示する", () => {
  const saved = { score: 100, raw: 120.5 };
  assert.equal(displayedScore(saved), 121);
  assert.deepEqual(saved, { score: 100, raw: 120.5 });
  assert.equal(displayedScore({ score: 100, raw: 120.4 }), 120);
  assert.equal(displayedScore({ score: 70, raw: null }), 70);
  assert.equal(displayedScore({ score: 0, raw: -20 }), 0);
  assert.equal(displayedScore({ score: null, raw: null }), null);
});
test("7時間・10時間・11時間の加点は0・30・40、分単位で境界を判定", () => {
  const scores = ["17:00", "17:59", "18:00", "19:00", "20:00", "21:00"].map(
    (closing) =>
      calculate({ ...input(), closing }, config(), {}, null, now).breakdown
        .hours,
  );
  assert.deepEqual(scores, [0, 0, 10, 20, 30, 40]);
});
test("ファンスタは基準回数以上で加点し、営業時間・過去密度・部屋数に依存しない", () => {
  const c = config();
  assert.deepEqual([21, 22, 32, 33].map((slots) =>
    calculate({ ...input(), slots }, c, {}, null, now).breakdown.fan), [0, 3, 3, 5]);
  for (const closing of ["17:00", "20:00", "21:00"]) {
    for (const baselineDensities of [[], [100, 100, 100, 100]]) {
      const d = calculate({ ...input(), closing, slots: 33, rooms: [101, 102, 103],
        baselineDensities }, c, {}, null, now);
      assert.equal(d.breakdown.fan, 5);
      assert.equal(d.threeRooms, true);
    }
  }
  assert.equal(calculate({ ...input(), fan: "unpublished", slots: 33 }, c, {}, null, now).breakdown.fan, 0);
  c.fan.baselineSlots = 30;
  c.fan.highRatio = 2;
  c.fan.medium = 4;
  c.fan.high = 8;
  assert.deepEqual([29, 30, 59, 60].map((slots) =>
    calculate({ ...input(), slots }, c, {}, null, now).breakdown.fan), [0, 4, 4, 8]);
  // Saved settings may retain the old density threshold; it must not block the baseline boundary.
  const legacy = { ...c, fan: { ...c.fan, mediumRatio: 1.2 } };
  assert.equal(calculate({ ...input(), slots: 30 }, validateConfig(legacy), {}, null, now).breakdown.fan, 4);
});

test("営業時間とファンスタ回数は大きい加点だけを使う", () => {
  const d = calculate(
    {
      ...input(),
      closing: "20:00",
      slots: 60,
      baselineDensities: [2, 2, 2, 2],
    },
    config(),
    {},
    null,
    now,
  );
  assert.equal(d.breakdown.fan, 5);
  assert.equal(d.basic, 60);
  assert.equal(
    calculate(
      { ...input(), slots: 60, baselineDensities: [2, 2, 2] },
      config(),
      {},
      null,
      now,
    ).breakdown.fan,
    5,
  );
});

test("10月31日の33回・3部屋は5点で、営業時間15点との大きい方を合計に反映", () => {
  const c = config();
  c.hours.ten = 15;
  const d = calculate({ ...input("2026-10-31"), closing: "20:00", slots: 33,
    rooms: [101, 102, 103], birthdays: [{ id: "kuromi", name: "クロミ" }] }, c, {}, null, now);
  assert.equal(d.breakdown.fan, 5);
  assert.equal(d.breakdown.hours, 15);
  assert.equal(d.threeRooms, true);
  assert.equal(d.score, 85);
});
test("誕生日は0・5・10、複数は最大値で、雨の係数も共通", () => {
  const c = config();
  c.birthdays = { a: 5, b: 10 };
  const d = calculate(
    {
      ...input(),
      birthdays: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
    },
    c,
    {},
    weather(),
    now,
  );
  assert.equal(d.breakdown.birthday, 10);
  assert.equal(d.score, 34);
  assert.throws(() => validateConfig({ ...c, birthdays: { a: 15 } }));
});
test("連休日数と初日・最終日の減点、月境界、国民の休日も判定", () => {
  const s = emptyState();
  assert.deepEqual(
    [19, 20, 21, 22, 23].map((d) =>
      holidayPoints(`2026-09-${d}`, config(), s.holidays),
    ),
    [11, 16, 16, 16, 11],
  );
  assert.equal(s.holidays["2026-09-22"], "休日");
  const h = { "2026-11-02": "休", "2026-11-03": "休" };
  assert.deepEqual(
    ["2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03"].map((d) =>
      holidayPoints(d, config(), h),
    ),
    [7, 12, 12, 7],
  );
});
test("開催期間全体の加点はなく、開始・終了と初週・最終週の土日のみ", () => {
  const c = config();
  c.events = [
    { id: "a", name: "Halloween", from: "2026-10-01", to: "2026-10-31" },
  ];
  assert.deepEqual(
    ["2026-10-01", "2026-10-03", "2026-10-04", "2026-10-17", "2026-10-31"].map(
      (d) => calculate(input(d), c, {}, null, now).breakdown.event,
    ),
    [12, 10, 10, 0, 12],
  );
});

test("イベント名は開始日と終了日だけに表示し、初週・最終週の土日は加点だけ行う", () => {
  const c = config();
  c.events = [
    { id: "halloween", name: "ハロウィン🎃", from: "2026-09-18", to: "2026-11-10" },
    { id: "christmas", name: "クリスマス🎄", from: "2026-11-13", to: "2026-12-25" },
  ];
  const cases: [string, string[]][] = [
    ["2026-09-18", ["ハロウィン🎃開始"]],
    ["2026-09-19", []],
    ["2026-10-31", []],
    ["2026-11-07", []],
    ["2026-11-10", ["ハロウィン🎃終了"]],
    ["2026-11-13", ["クリスマス🎄開始"]],
    ["2026-11-14", []],
    ["2026-12-25", ["クリスマス🎄終了"]],
    ["2026-12-26", []],
  ];
  for (const [date, topics] of cases)
    assert.deepEqual(calculate(input(date), c, {}, null, now).topics, topics);
  assert.equal(calculate(input("2026-09-19"), c, {}, null, now).breakdown.event, 10);
  assert.equal(calculate(input("2026-11-07"), c, {}, null, now).breakdown.event, 10);
  c.event.boundary = 0;
  const state = emptyState();
  for (const date of ["2026-11-10", "2026-11-13", "2026-12-25"])
    state.days[date] = calculate(input(date), c, {}, null, now);
  const published = projectPublic(state, now);
  assert.deepEqual(published.days.flatMap((day) => topicsFor(day).map((topic) => topic.text)),
    ["ハロウィン🎃終了", "クリスマス🎄開始", "クリスマス🎄終了"]);
  assert.equal(forecastMonth(published, "2026-11").byDate.get("2026-11-13")?.topics[0], "クリスマス🎄開始");
});

test("同日開催とイベントの切替日も開始・終了を区別し、誕生日と日別理由を保持", () => {
  const c = config();
  c.events = [
    { id: "a", name: "前のイベント", from: "2026-10-01", to: "2026-10-31" },
    { id: "b", name: "当日イベント", from: "2026-10-31", to: "2026-10-31" },
  ];
  c.overrides = [{ date: "2026-10-31", points: 0, level: "", weather: "", reason: "特別営業", note: "" }];
  const d = calculate({ ...input("2026-10-31"), birthdays: [{ id: "kuromi", name: "クロミ" }] }, c, {}, null, now);
  assert.deepEqual(d.topics, ["クロミのお誕生日", "前のイベント終了", "当日イベント開始", "当日イベント終了", "特別営業"]);
});
test("天気は2日先まで全量、3〜6日半量、7日以降なし", () => {
  const c = config(),
    w = weather();
  assert.deepEqual(
    [19, 20, 21, 24, 25].map(
      (n) =>
        calculate(
          input(`2026-10-${n}`),
          c,
          {},
          { ...w, date: `2026-10-${n}` },
          now,
        ).factor,
    ),
    [0.8, 0.8, 0.9, 0.9, 1],
  );
  assert.equal(
    calculate(input(), c, {}, { ...w, validUntil: now.toISOString() }, now)
      .factor,
    1,
  );
});
test("3部屋でも22枠なら表示なし、23枠以上のみ表示", () => {
  assert.equal(
    calculate({ ...input(), rooms: [101, 102, 103] }, config(), {}, null, now)
      .threeRooms,
    false,
  );
  assert.equal(
    calculate(
      { ...input(), rooms: [101, 102, 103], slots: 23 },
      config(),
      {},
      null,
      now,
    ).threeRooms,
    true,
  );
});
test("休園＞固定レベル＞自動、固定レベルは架空の点数を持たない", () => {
  const c = config();
  c.overrides = [
    {
      date: input().date,
      level: "veryBusy",
      points: 0,
      reason: "特別営業",
      note: "内部限定",
      weather: "",
    },
  ];
  const fixed = calculate(input(), c, {}, weather(), now);
  assert.equal(fixed.level, "veryBusy");
  assert.equal(fixed.score, null);
  assert.equal(
    calculate({ ...input(), status: "closed" }, c, {}, weather(), now).level,
    "closed",
  );
});
test("当日と当月の過去日は凍結、過去月は削除、未来だけ設定を再計算", () => {
  const s = emptyState();
  for (const date of ["2026-09-30", "2026-10-17", "2026-10-18", "2026-10-19"])
    s.days[date] = calculate(input(date), config(), {}, null, now);
  const old = s.days["2026-10-18"];
  s.config.weekday.adjacent = 80;
  const next = mergeForUpdate(s, [input("2026-10-18"), input()], null, now);
  assert.deepEqual(next.days["2026-10-18"], old);
  assert.ok(next.days["2026-10-17"]);
  assert.equal(next.days["2026-09-30"], undefined);
  assert.equal(next.days["2026-10-19"].score, 83);
  assert.equal(Object.keys(pruneState(next, "2026-11-01").days).length, 0);
});
test("当日の日別調整は明示した保存だけ再計算し、保存済み天気と過去日の固定を維持", () => {
  const s = emptyState(),
    today = "2026-10-19",
    savingAt = new Date("2026-10-19T09:00:00+09:00");
  s.days["2026-10-18"] = calculate(input("2026-10-18"), s.config, {}, null, now);
  s.days[today] = calculate(input(today), s.config, {}, weather("cloud"), now);
  const original = structuredClone(s.days);
  s.config.overrides = [{
    date: today, points: 5, level: "", weather: "", reason: "運動会振替休日", note: "内部限定",
  }];
  const inputs = [input("2026-10-18"), input(today), input("2026-10-20")];
  const automatic = mergeForUpdate(s, inputs, null, savingAt);
  assert.deepEqual(automatic.days[today], original[today]);
  const saved = mergeForUpdate(s, inputs, null, savingAt, true);
  assert.equal(saved.days[today].breakdown.manual, 5);
  assert.equal(saved.days[today].score, original[today].score! + 5);
  assert.ok(saved.days[today].topics.includes("運動会振替休日"));
  assert.deepEqual(saved.days[today].weather, original[today].weather);
  assert.deepEqual(saved.days["2026-10-18"], original["2026-10-18"]);
  assert.ok(saved.days["2026-10-20"]);
  s.config.overrides[0].level = "veryBusy";
  assert.equal(mergeForUpdate(s, inputs, null, savingAt, true).days[today].level, "veryBusy");
  const closed = mergeForUpdate(s, [{ ...input(today), status: "closed" }], null, savingAt, true);
  assert.equal(closed.days[today].level, "closed");
});

test("公開DTOから点数・係数・内部メモを除外、期限切れは保存済みの天気補正なしレベル", () => {
  const s = emptyState(),
    c = config();
  c.weekday.adjacent = 55;
  c.overrides = [
    {
      date: input().date,
      level: "",
      points: 0,
      reason: "公開理由",
      note: "SECRET_NOTE",
      weather: "",
    },
  ];
  s.days[input().date] = calculate(
    input(),
    c,
    {},
    { ...weather(), validUntil: "2026-10-19T00:00:00Z" },
    now,
  );
  assert.equal(projectPublic(s, now).days[0].level, "normal");
  const publicValue = projectPublic(s, new Date("2026-10-19T01:00:00Z"));
  assert.equal(publicValue.days[0].level, "moderate");
  assert.equal(publicValue.days[0].weather, null);
  assert.doesNotMatch(
    JSON.stringify(publicValue),
    /score|breakdown|factor|SECRET_NOTE|threshold/,
  );
});
test("予想未作成でも公開月の保存済み祝日を返し、範囲外の祝日は含めない", () => {
  const state = emptyState();
  state.holidays["2026-10-31"] = "追加の祝日（テスト）";
  const result = projectPublic(state, now);
  assert.equal(result.days.length, 0);
  assert.equal(result.holidays["2026-10-12"], "スポーツの日");
  assert.equal(result.holidays["2026-10-31"], "追加の祝日（テスト）");
  assert.equal(result.holidays["2026-11-03"], "文化の日");
  assert.equal(result.holidays["2026-09-22"], undefined);
  assert.equal(result.holidays["2027-01-01"], undefined);
});
test("気象庁の実XMLで大分県中部・大分地点・6時間降水確率を読む", () => {
  const short = readFileSync(
      new URL("./fixtures/short.xml", import.meta.url),
      "utf8",
    ),
    weekly = readFileSync(
      new URL("./fixtures/weekly.xml", import.meta.url),
      "utf8",
    );
  const a = parseBulletin(
      short,
      "https://www.data.jma.go.jp/VPFD51",
      now.toISOString(),
    ),
    b = parseBulletin(
      weekly,
      "https://www.data.jma.go.jp/VPFW50",
      now.toISOString(),
    );
  const tomorrow = a.find((w) => w.date === "2026-10-19")!;
  assert.equal(tomorrow.region, "大分県 中部");
  assert.equal(tomorrow.text, "くもり");
  assert.equal(tomorrow.high, 29);
  assert.equal(tomorrow.low, 20);
  assert.deepEqual(
    tomorrow.rain.map((r) => [r.from, r.to]),
    [
      [0, 6],
      [6, 12],
      [12, 18],
      [18, 24],
    ],
  );
  assert.equal(b.find((w) => w.date === "2026-10-20")?.dailyRain, 30);
  const merged = mergeWeather({ VPFD51: a, VPFW50: b }, ["VPFD51", "VPFW50"]);
  assert.equal(merged["2026-10-19"].high, 29);
  assert.equal(
    parseBulletin(
      short.replace("<InfoType>発表</InfoType>", "<InfoType>取消</InfoType>"),
      "VPFD51",
      now.toISOString(),
    ).length,
    0,
  );
  assert.equal(classifyWeather("くもり一時雨"), "occasionalRain");
  assert.equal(classifyWeather("雨で雷を伴い激しく降る"), "rain");
});
test("フィードの取得URLは気象庁の大分県2電文に限定", () => {
  const entries = ["VPFD51", "VPFW50"]
    .map(
      (t) =>
        `<entry><id>https://www.data.jma.go.jp/developer/xml/data/20261018000000_0_${t}_440000.xml</id><updated>2026-10-18T00:00:00Z</updated></entry>`,
    )
    .join("");
  assert.equal(
    bulletinUrls(
      `<feed>${entries}<entry><id>https://evil.test/VPFD51_440000.xml</id></entry></feed>`,
    ).length,
    2,
  );
});
