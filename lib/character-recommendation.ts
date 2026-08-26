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
  eventCount: number;
  count: number;
  appearances: CharacterRecommendationAppearance[];
};

export type CharacterRecommendationTitleGroup = {
  title: string;
  count: number;
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

function isFanStudioEntry(entry: ScheduleEntry) {
  return [entry.title, entry.scheduleType, entry.location]
    .join(" ")
    .normalize("NFKC")
    .includes("ファンスタジオ");
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

    const dailyEntries = matchingEntries.filter(
      (entry) => entry.date <= date && (entry.endDate ?? entry.date) >= date,
    );
    const appearances = new Map<string, CharacterRecommendationAppearance>();
    if (character.isFanStudioRegular && !dailyEntries.some(isFanStudioEntry)) {
      appearances.set("regular-fan-studio", {
        key: "regular-fan-studio",
        time: "毎日",
        title: "ファンスタジオ",
        location: "ファンスタジオ",
        isRegularFanStudio: true,
      });
    }

    dailyEntries.forEach((entry) => {
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
      eventCount: groupRecommendationTitles(dailyAppearances).length,
      count: dailyAppearances.length,
      appearances: dailyAppearances,
    }];
  }).sort((left, right) => (
    right.eventCount - left.eventCount
    || right.count - left.count
    || left.date.localeCompare(right.date)
  ));
}

function hasSameRecommendationScore(
  left: CharacterRecommendationDay,
  right: CharacterRecommendationDay,
) {
  return left.eventCount === right.eventCount && left.count === right.count;
}

export function recommendationRank(days: CharacterRecommendationDay[], index: number) {
  if (!days[index]) return 0;
  return days.slice(0, index).filter((day, dayIndex) => (
    dayIndex === 0 || !hasSameRecommendationScore(day, days[dayIndex - 1])
  )).length + (index > 0 && hasSameRecommendationScore(days[index], days[index - 1]) ? 0 : 1);
}

export function groupRecommendationTitles(
  appearances: CharacterRecommendationAppearance[],
): CharacterRecommendationTitleGroup[] {
  const groups = new Map<string, CharacterRecommendationTitleGroup>();
  appearances.forEach((appearance) => {
    const originalTitle = appearance.title.normalize("NFKC").trim();
    const title = appearance.isRegularFanStudio || originalTitle.includes("ファンスタジオ")
      ? "ファンスタジオ"
      : originalTitle || "登場予定";
    const current = groups.get(title);
    groups.set(title, { title, count: (current?.count ?? 0) + 1 });
  });
  return Array.from(groups.values());
}

export function buildCharacterRecommendationMessage({
  month,
  characterName,
  days,
  detailsUrl,
}: {
  month: string;
  characterName: string;
  days: CharacterRecommendationDay[];
  detailsUrl: string;
}) {
  if (!characterName || days.length === 0) return "対象月に掲載中の登場予定がありません。";
  const [, monthNumber] = month.split("-").map(Number);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const formatDate = (value: string) => {
    const date = new Date(`${value}T00:00:00Z`);
    return `${date.getUTCMonth() + 1}/${date.getUTCDate()}(${weekdays[date.getUTCDay()]})`;
  };
  const bestDays = days.filter((day) => hasSameRecommendationScore(day, days[0]));
  const bestDateText = bestDays.slice(0, 3).map((day) => formatDate(day.date)).join("・");
  const moreBestDays = bestDays.length > 3 ? `・ほか${bestDays.length - 3}日` : "";

  return `${characterName}推しさんへ🩷
${monthNumber}月のおすすめ日は${bestDateText}${moreBestDays}！
詳しい時間・場所はこちら👇
${detailsUrl}
※掲載予定は変更になる場合があります。お出かけ前に公式サイトの最新情報もご確認ください。`;
}
