import assert from "node:assert/strict";
import test from "node:test";
import type { Character } from "@/data/types";
import {
  daysUntilBirthday,
  formatCharacterBirthday,
  getCharacterBirthday,
  getCharacterBirthdaysInRange,
  getNextBirthdayDate,
  getNextCharacterBirthdayGroup,
  getUpcomingCharacterBirthdays,
  isBirthdayCountdownVisible,
  isValidBirthday,
  todayInJapan,
} from "@/lib/character-birthday";

function character(
  id: string,
  birthdayMonth: number | null,
  birthdayDay: number | null,
  displayOrder = 999,
): Character {
  return {
    id,
    slug: id,
    name: id,
    nameKana: id,
    image: "/character-placeholder.svg",
    description: "",
    officialUrl: "",
    isFanStudioRegular: false,
    themeColor: "#ef8099",
    displayOrder,
    birthdayMonth,
    birthdayDay,
  };
}

test("誕生日として存在する月日だけを許可する", () => {
  assert.equal(isValidBirthday(1, 1), true);
  assert.equal(isValidBirthday(2, 29), true);
  assert.equal(isValidBirthday(2, 30), false);
  assert.equal(isValidBirthday(4, 31), false);
  assert.equal(isValidBirthday(13, 1), false);
});

test("未登録または不正な月日はキャラクターの誕生日として返さない", () => {
  assert.equal(getCharacterBirthday(character("missing", null, null)), null);
  assert.equal(getCharacterBirthday(character("incomplete", 3, null)), null);
  assert.equal(getCharacterBirthday(character("invalid", 2, 30)), null);
  assert.deepEqual(getCharacterBirthday(character("valid", 3, 6)), { month: 3, day: 6 });
});

test("誕生日を日本語表記へ変換する", () => {
  assert.equal(formatCharacterBirthday({ month: 8, day: 10 }), "8月10日");
});

test("日本時間の日付を返す", () => {
  assert.equal(todayInJapan(new Date("2026-07-28T14:59:59Z")), "2026-07-28");
  assert.equal(todayInJapan(new Date("2026-07-28T15:00:00Z")), "2026-07-29");
});

test("今年または翌年の次回誕生日を返す", () => {
  assert.equal(getNextBirthdayDate({ month: 7, day: 28 }, "2026-07-28"), "2026-07-28");
  assert.equal(getNextBirthdayDate({ month: 1, day: 1 }, "2026-12-31"), "2027-01-01");
  assert.equal(daysUntilBirthday({ month: 1, day: 1 }, "2026-12-31"), 1);
});

test("2月29日は次に実在する日付まで進める", () => {
  assert.equal(getNextBirthdayDate({ month: 2, day: 29 }, "2026-03-01"), "2028-02-29");
  assert.equal(getNextBirthdayDate({ month: 2, day: 29 }, "2028-02-29"), "2028-02-29");
});

test("キャラクターを次回誕生日と表示順で並べる", () => {
  const upcoming = getUpcomingCharacterBirthdays([
    character("new-year", 1, 1),
    character("second", 12, 31, 2),
    character("first", 12, 31, 1),
    character("missing", null, null),
  ], "2026-12-30");

  assert.deepEqual(
    upcoming.map(({ character: item, daysUntil }) => [item.id, daysUntil]),
    [["first", 1], ["second", 1], ["new-year", 2]],
  );
});

test("最も近い同日誕生日をグループで返す", () => {
  const group = getNextCharacterBirthdayGroup([
    character("later", 1, 1),
    character("same-1", 12, 31),
    character("same-2", 12, 31),
  ], "2026-12-30");

  assert.deepEqual(group.map(({ character: item }) => item.id), ["same-1", "same-2"]);
});

test("誕生日カウントダウンは30日前から当日まで表示する", () => {
  assert.equal(isBirthdayCountdownVisible(31), false);
  assert.equal(isBirthdayCountdownVisible(30), true);
  assert.equal(isBirthdayCountdownVisible(1), true);
  assert.equal(isBirthdayCountdownVisible(0), true);
  assert.equal(isBirthdayCountdownVisible(-1), false);
});

test("指定した検索期間に含まれる誕生日を列挙する", () => {
  const birthdays = getCharacterBirthdaysInRange([
    character("august", 8, 10, 2),
    character("september", 9, 1, 1),
    character("outside", 10, 1),
    character("missing", null, null),
  ], "2026-08-07", "2026-09-05");

  assert.deepEqual(
    birthdays.map(({ character: item, date, daysUntil }) => [item.id, date, daysUntil]),
    [["august", "2026-08-10", 3], ["september", "2026-09-01", 25]],
  );
});

test("誕生日の期間検索は年またぎに対応する", () => {
  const birthdays = getCharacterBirthdaysInRange([
    character("new-year", 1, 1),
    character("year-end", 12, 31),
  ], "2026-12-30", "2027-01-02");

  assert.deepEqual(
    birthdays.map(({ character: item, date }) => [item.id, date]),
    [["year-end", "2026-12-31"], ["new-year", "2027-01-01"]],
  );
});
