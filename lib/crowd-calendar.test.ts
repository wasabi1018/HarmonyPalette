import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCrowdCalendarMonth,
  crowdOverridesEqual,
  normalizeCrowdOverrides,
  buildCrowdCalendarFacts,
  crowdCalendarDetails,
  emptyCrowdSettings,
  isCrowdNightClosingTime,
  normalizeCrowdAnnotations,
  validateCrowdAnnotations,
  validateCrowdSettings,
} from "@/lib/crowd-calendar";

test("月に必要な週数だけ日曜始まりのセルを作る", () => {
  const october = buildCrowdCalendarMonth("2026-10");
  assert.ok(october);
  assert.equal(october.weekCount, 5);
  assert.equal(october.cells.length, 35);
  assert.equal(october.cells[0].date, "2026-09-27");
  assert.equal(october.cells.at(-1)?.date, "2026-10-31");

  const august = buildCrowdCalendarMonth("2026-08");
  assert.ok(august);
  assert.equal(august.weekCount, 6);
  assert.equal(august.cells.length, 42);
});

test("ナイト営業は17時より後。17時ちょうど・未確認時刻は対象外", () => {
  for (const time of ["16:59", "17:00", "17:00:00", null, undefined, "25:00", "17:60", "不明"]) assert.equal(isCrowdNightClosingTime(time), false, String(time));
  for (const time of ["17:01", "17:30:00", "18:00", "17:00:01"]) assert.equal(isCrowdNightClosingTime(time), true, time);
});

test("部屋数は確認済みファンスタの異なる部屋番号を集計し、休園日は夜営業にならない", () => {
  const date = "2026-10-01";
  const entry = { date, kind: "greeting", sourceId: "harmonyland-funstudio", scheduleType: "", location: "ファンスタジオ101号室", verified: true };
  const facts = buildCrowdCalendarFacts("2026-10", [
    { date, status: "open", closingTime: "17:30:00" },
    { date: "2026-10-02", status: "closed", closingTime: "18:00" },
  ], [entry, entry, { ...entry, location: "ファンスタジオ１０２号室" }, { ...entry, location: "ファンスタジオ103号室", verified: false }, { ...entry, location: "イベントホール", kind: "event" }], [{ date, name: "テストキャラ" }]);
  assert.deepEqual(facts[date].rooms, [101, 102]);
  assert.equal(facts[date].night, true);
  assert.equal(facts["2026-10-02"].night, false);
  assert.deepEqual(facts[date].birthdays, ["テストキャラ"]);
  assert.equal(Object.keys(facts).length, 31);
});

test("季節イベントは開始日・最終日のみ表示し、月をまたぐ期間と同日の両端に対応する", () => {
  const settings = emptyCrowdSettings();
  settings.events = [{ id: "summer", name: "夏イベント", startDate: "2026-08-01", endDate: "2026-09-01" }];
  assert.deepEqual(crowdCalendarDetails("2026-08-01", false, settings, {}, {}).map((item) => item.text), ["夏イベント開始"]);
  assert.deepEqual(crowdCalendarDetails("2026-08-02", false, settings, {}, {}), []);
  assert.deepEqual(crowdCalendarDetails("2026-09-01", false, settings, {}, {}).map((item) => item.text), ["夏イベント最終日"]);
  settings.events[0].endDate = "2026-08-01";
  assert.equal(crowdCalendarDetails("2026-08-01", false, settings, {}, {}).length, 2);
});

test("編集した表示文言・自由記載と3部屋の手動補正を反映。休園でも誕生日と記載は残す", () => {
  const date = "2026-10-01";
  const settings = emptyCrowdSettings();
  settings.labels = { fanStudio: "ファンスタ3部屋", night: "夜まで営業", birthday: "お誕生日", eventStart: "初日", eventEnd: "終了" };
  const facts = { [date]: { rooms: [101, 102, 103], night: true, closingTime: "18:00", birthdays: ["テスト"] } };
  const details = crowdCalendarDetails(date, false, settings, { [date]: { note: "振替休日" } }, facts);
  assert.deepEqual(details.map((item) => item.text), ["ファンスタ3部屋", "夜まで営業", "テストお誕生日", "振替休日"]);
  assert.deepEqual(crowdCalendarDetails(date, true, settings, { [date]: { note: "振替休日", fanStudio: "show" } }, facts).map((item) => item.kind), ["birthday", "note"]);
  assert.deepEqual(crowdCalendarDetails(date, false, settings, { [date]: { fanStudio: "hide", hideBirthdays: true, note: "  " } }, facts).map((item) => item.kind), ["night"]);
  assert.equal(crowdCalendarDetails(date, false, settings, { [date]: { fanStudio: "show" } }, {}).at(0)?.kind, "fanStudio");
});

test("日付の情報は対象月のみ。空の記載は非表示、無効な設定は保存時に拒否する", () => {
  assert.deepEqual(normalizeCrowdAnnotations("2026-02", { "2026-02-01": { note: "  " }, "2026-02-02": { note: " 振替休日 ", fanStudio: "show" }, "2026-02-29": { note: "存在しない日" } }), { "2026-02-02": { note: "振替休日", fanStudio: "show" } });
  for (const input of [{ "2026-03-01": { note: "月外" } }, { "2026-02-29": {} }, { "2026-02-01": { note: "a".repeat(81) } }, { "2026-02-01": { fanStudio: true } }]) assert.throws(() => validateCrowdAnnotations("2026-02", input));
});

test("共通イベントの逆転した期間・重複ID・空の表示文言は保存しない", () => {
  const settings = emptyCrowdSettings();
  assert.deepEqual(validateCrowdSettings(settings), settings);
  assert.throws(() => validateCrowdSettings({ ...settings, labels: { ...settings.labels, night: "" } }));
  const event = { id: "test", name: "夏", startDate: "2026-08-01", endDate: "2026-09-01" };
  assert.throws(() => validateCrowdSettings({ ...settings, events: [event, event] }));
  assert.throws(() => validateCrowdSettings({ ...settings, events: [{ ...event, endDate: "2026-07-01" }] }));
});

test("営業日は普通が初期値で、休園日は手動設定より優先する", () => {
  const calendar = buildCrowdCalendarMonth(
    "2026-10",
    { "2026-10-03": "busy", "2026-10-14": "veryBusy" },
    new Set(["2026-10-14"]),
  );
  assert.ok(calendar);
  assert.equal(calendar.cells.find((cell) => cell.date === "2026-10-01")?.level, "normal");
  assert.equal(calendar.cells.find((cell) => cell.date === "2026-10-03")?.level, "busy");
  assert.equal(calendar.cells.find((cell) => cell.date === "2026-10-14")?.level, "closed");
  assert.equal(calendar.cells.find((cell) => cell.date === "2026-09-30")?.level, null);
});

test("下書きでは対象月の有効な混雑日のみ保存する", () => {
  const overrides = normalizeCrowdOverrides("2026-02", {
    "2026-02-01": "busy",
    "2026-02-02": "normal",
    "2026-02-29": "veryBusy",
    "2026-03-01": "veryBusy",
    "2026-02-05": "unknown",
  });
  assert.deepEqual(overrides, { "2026-02-01": "busy" });
  assert.equal(crowdOverridesEqual(overrides, { "2026-02-01": "busy" }), true);
  assert.equal(crowdOverridesEqual(overrides, {}), false);
  assert.equal(buildCrowdCalendarMonth("2026-13"), null);
});
