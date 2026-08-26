import type { Character } from "@/data/types";
import { getEntryCharacterNames, getScheduleSourceKey, type ScheduleEntry } from "@/lib/schedule-store";

export type CharacterRecommendationAppearance = {
  key: string;
  time: string;
  title: string;
  location: string;
  isRegularFanStudio: boolean;
};

export type CharacterRecommendationDay = {
  date: string;
  count: number;
  appearances: CharacterRecommendationAppearance[];
};

function dateFromIso(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function isoFromDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  const date = dateFromIso(value);
  date.setUTCDate(date.getUTCDate() + days);
  return isoFromDate(date);
}

function endOfMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return isoFromDate(new Date(Date.UTC(year, monthNumber, 0)));
}

function datesInMonth(month: string) {
  const first = `${month}-01`;
  const last = endOfMonth(month);
  const dates: string[] = [];
  for (let date = first; date <= last; date = addDays(date, 1)) dates.push(date);
  return dates;
}

function entryMatchesCharacter(entry: ScheduleEntry, character: Character) {
  return entry.characterIds.includes(character.id)
    || getEntryCharacterNames(entry).includes(character.name);
}

function appearanceKey(entry: ScheduleEntry) {
  const sourceKey = getScheduleSourceKey(entry) ?? entry.id;
  return [sourceKey, entry.startTime, entry.location, entry.title].join("|");
}

export function buildCharacterRecommendations(
  month: string,
  character: Character,
  entries: ScheduleEntry[],
  closedDates: ReadonlySet<string> = new Set(),
): CharacterRecommendationDay[] {
  const first = `${month}-01`;
  const last = endOfMonth(month);
  const matchingEntries = entries.filter((entry) => (
    entryMatchesCharacter(entry, character)
    && entry.date <= last
    && (entry.endDate ?? entry.date) >= first
  ));

  return datesInMonth(month).flatMap((date) => {
    if (closedDates.has(date)) return [];

    const appearances = new Map<string, CharacterRecommendationAppearance>();
    if (character.isFanStudioRegular) {
      appearances.set("regular-fan-studio", {
        key: "regular-fan-studio",
        time: "毎日",
        title: "ファンスタジオ",
        location: "ファンスタジオ",
        isRegularFanStudio: true,
      });
    }

    matchingEntries
      .filter((entry) => entry.date <= date && (entry.endDate ?? entry.date) >= date)
      .forEach((entry) => {
        const key = appearanceKey(entry);
        appearances.set(key, {
          key,
          time: entry.startTime,
          title: entry.title,
          location: entry.location,
          isRegularFanStudio: false,
        });
      });

    const dailyAppearances = Array.from(appearances.values()).sort((left, right) => (
      left.time.localeCompare(right.time, "ja")
      || left.title.localeCompare(right.title, "ja")
      || left.location.localeCompare(right.location, "ja")
    ));
    if (dailyAppearances.length === 0) return [];

    return [{
      date,
      count: dailyAppearances.length,
      appearances: dailyAppearances,
    }];
  }).sort((left, right) => right.count - left.count || left.date.localeCompare(right.date));
}

export function recommendationRank(days: CharacterRecommendationDay[], index: number) {
  if (!days[index]) return 0;
  return days.slice(0, index).filter((day, dayIndex) => (
    dayIndex === 0 || day.count !== days[dayIndex - 1].count
  )).length + (index > 0 && days[index].count === days[index - 1].count ? 0 : 1);
}
