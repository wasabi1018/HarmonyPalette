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

export type CharacterRecommendationRankingGroup = {
  rank: number;
  days: CharacterRecommendationDay[];
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

function recommendationScheduleSignature(day: CharacterRecommendationDay) {
  return JSON.stringify(
    groupRecommendationTitles(day.appearances)
      .map((group) => [group.title, group.count] as const)
      .sort(([leftTitle], [rightTitle]) => leftTitle.localeCompare(rightTitle, "ja")),
  );
}

export function groupRecommendationRankingDays(
  days: CharacterRecommendationDay[],
): CharacterRecommendationRankingGroup[] {
  const groups: Array<CharacterRecommendationRankingGroup & { signature: string }> = [];

  days.forEach((day, index) => {
    const rank = recommendationRank(days, index);
    const signature = recommendationScheduleSignature(day);
    const existing = groups.find((group) => group.rank === rank && group.signature === signature);
    if (existing) {
      existing.days.push(day);
      return;
    }
    groups.push({ rank, days: [day], signature });
  });

  return groups.map(({ rank, days: groupedDays }) => ({ rank, days: groupedDays }));
}

export function buildCharacterRecommendationMessage({
  month,
  characterName,
  days,
}: {
  month: string;
  characterName: string;
  days: CharacterRecommendationDay[];
}) {
  if (!characterName || days.length === 0) return "対象月に掲載中の登場予定がありません。";
  const [, monthNumber] = month.split("-").map(Number);
  const featuredDays = groupRecommendationRankingDays(days)[0].days;
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const dates = featuredDays.slice(0, 3).map((day) => {
    const date = dateFromIso(day.date);
    return `${date.getUTCMonth() + 1}/${date.getUTCDate()}(${weekdays[date.getUTCDay()]})`;
  }).join("・");
  const moreDays = featuredDays.length > 3 ? `・ほか${featuredDays.length - 3}日` : "";
  const appearances = featuredDays[0].appearances;
  const highlights = groupRecommendationTitles(appearances).map((group) => (
    group.title === "ファンスタジオ" && appearances.every((appearance) => (
      appearance.isRegularFanStudio || !appearance.title.normalize("NFKC").includes("ファンスタジオ")
    ))
      ? "ファンスタジオで会える予定✨"
      : `${group.title}が${group.count}回！`
  )).join("\n");
  const characterHashtag = characterName.replace(/[^\p{L}\p{N}_]/gu, "");

  return `${monthNumber}月、${characterName}好きが行くならこの日！🩷

${dates}${moreDays}は…

${highlights}

${characterName}推しさんは、ぜひこの日を狙ってみてね🩷

でも、この日に行けなくても大丈夫！

実は、${monthNumber}月に${characterName}とたくさん会える日をランキング形式でまとめました✨

🎁 ${characterName}に会える日ランキングが欲しい方へ

① このアカウントをフォロー
② この動画に「${characterName}」とコメント💬

→ ${characterName}の${monthNumber}月のランキングをDMで送ります💌

推しにたくさん会える日を見つけて、
${monthNumber}月のハーモニーランドを楽しもう🌈✨

※イベント内容・キャラクター出演は変更になる場合があります。来園前に公式情報をご確認ください。

#ハーモニーランド
#サンリオ${characterHashtag ? `\n#${characterHashtag}` : ""}
#子連れお出かけ`;
}
