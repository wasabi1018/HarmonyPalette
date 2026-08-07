import type { Character } from "@/data/types";

export type CharacterBirthday = {
  month: number;
  day: number;
};

export type CharacterBirthdayOccurrence = {
  character: Character;
  birthday: CharacterBirthday;
  date: string;
  daysUntil: number;
};

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const MAX_NEXT_BIRTHDAY_YEAR_OFFSET = 8;
export const BIRTHDAY_COUNTDOWN_WINDOW_DAYS = 30;

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function formatCalendarDate(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("日付はYYYY-MM-DD形式で指定してください。");

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    !Number.isInteger(year)
    || year < 1
    || month < 1
    || month > 12
    || day < 1
    || day > daysInMonth(year, month)
  ) {
    throw new Error("存在する日付を指定してください。");
  }

  return { year, month, day };
}

export function isValidBirthday(month: number, day: number) {
  return Number.isInteger(month)
    && Number.isInteger(day)
    && month >= 1
    && month <= 12
    && day >= 1
    && day <= daysInMonth(2000, month);
}

export function getCharacterBirthday(
  character: Pick<Character, "birthdayMonth" | "birthdayDay">,
): CharacterBirthday | null {
  if (
    character.birthdayMonth === null
    || character.birthdayDay === null
    || !isValidBirthday(character.birthdayMonth, character.birthdayDay)
  ) {
    return null;
  }

  return {
    month: character.birthdayMonth,
    day: character.birthdayDay,
  };
}

export function formatCharacterBirthday(birthday: CharacterBirthday) {
  return `${birthday.month}月${birthday.day}日`;
}

export function todayInJapan(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
  }).format(date);
}

export function getNextBirthdayDate(
  birthday: CharacterBirthday,
  today = todayInJapan(),
) {
  if (!isValidBirthday(birthday.month, birthday.day)) {
    throw new Error("誕生日の月日が正しくありません。");
  }

  const { year: currentYear } = parseCalendarDate(today);
  for (let offset = 0; offset <= MAX_NEXT_BIRTHDAY_YEAR_OFFSET; offset += 1) {
    const year = currentYear + offset;
    if (birthday.day > daysInMonth(year, birthday.month)) continue;

    const candidate = formatCalendarDate(year, birthday.month, birthday.day);
    if (candidate >= today) return candidate;
  }

  throw new Error("次の誕生日を計算できませんでした。");
}

export function daysUntilBirthday(
  birthday: CharacterBirthday,
  today = todayInJapan(),
) {
  const current = parseCalendarDate(today);
  const next = parseCalendarDate(getNextBirthdayDate(birthday, today));
  const currentTime = Date.UTC(current.year, current.month - 1, current.day);
  const nextTime = Date.UTC(next.year, next.month - 1, next.day);
  return Math.round((nextTime - currentTime) / DAY_IN_MILLISECONDS);
}

export function isBirthdayCountdownVisible(daysUntil: number) {
  return Number.isInteger(daysUntil)
    && daysUntil >= 0
    && daysUntil <= BIRTHDAY_COUNTDOWN_WINDOW_DAYS;
}

export function getUpcomingCharacterBirthdays(
  characters: Character[],
  today = todayInJapan(),
): CharacterBirthdayOccurrence[] {
  return characters.flatMap((character) => {
    const birthday = getCharacterBirthday(character);
    if (!birthday) return [];

    const date = getNextBirthdayDate(birthday, today);
    return [{
      character,
      birthday,
      date,
      daysUntil: daysUntilBirthday(birthday, today),
    }];
  }).sort((left, right) => (
    left.daysUntil - right.daysUntil
    || (left.character.displayOrder ?? 999) - (right.character.displayOrder ?? 999)
    || (left.character.nameKana || left.character.name).localeCompare(
      right.character.nameKana || right.character.name,
      "ja",
    )
    || left.character.name.localeCompare(right.character.name, "ja")
    || left.character.id.localeCompare(right.character.id)
  ));
}

export function getNextCharacterBirthdayGroup(
  characters: Character[],
  today = todayInJapan(),
) {
  const upcoming = getUpcomingCharacterBirthdays(characters, today);
  if (upcoming.length === 0) return [];
  return upcoming.filter(({ daysUntil }) => daysUntil === upcoming[0].daysUntil);
}

export function getCharacterBirthdaysInRange(
  characters: Character[],
  fromDate: string,
  toDate: string,
): CharacterBirthdayOccurrence[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) return [];
  const from = parseCalendarDate(fromDate);
  const to = parseCalendarDate(toDate);
  if (fromDate > toDate) return [];

  const currentTime = Date.UTC(from.year, from.month - 1, from.day);
  return characters.flatMap((character) => {
    const birthday = getCharacterBirthday(character);
    if (!birthday) return [];

    const occurrences: CharacterBirthdayOccurrence[] = [];
    for (let year = from.year; year <= to.year; year += 1) {
      if (birthday.day > daysInMonth(year, birthday.month)) continue;
      const date = formatCalendarDate(year, birthday.month, birthday.day);
      if (date < fromDate || date > toDate) continue;
      const occurrenceTime = Date.UTC(year, birthday.month - 1, birthday.day);
      occurrences.push({
        character,
        birthday,
        date,
        daysUntil: Math.round((occurrenceTime - currentTime) / DAY_IN_MILLISECONDS),
      });
    }
    return occurrences;
  }).sort((left, right) => (
    left.date.localeCompare(right.date)
    || (left.character.displayOrder ?? 999) - (right.character.displayOrder ?? 999)
    || (left.character.nameKana || left.character.name).localeCompare(
      right.character.nameKana || right.character.name,
      "ja",
    )
    || left.character.name.localeCompare(right.character.name, "ja")
    || left.character.id.localeCompare(right.character.id)
  ));
}
