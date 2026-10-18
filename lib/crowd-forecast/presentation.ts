import { addDays, datesBetween, formatDateRanges, weekday } from "./date";
import type { PublicDay, PublicForecast } from "./types";

export function placeholderDay(date: string): PublicDay {
  return { date, level: "pending", opening: null, closing: null,
    schedule: "unconfirmed", fan: "unconfirmed", threeRooms: false,
    topics: [], weather: null, archived: false, updatedAt: "" };
}

export function fullDate(date: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "long", day: "numeric", weekday: "short", timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function topicsFor(day: PublicDay) {
  const topics: { key: string; text: string; night?: boolean }[] = [];
  if (day.threeRooms) topics.push({ key: "fan", text: "ファンスタ3部屋" });
  if (day.closing && day.closing >= "18:00" && day.level !== "closed")
    topics.push({ key: "night", text: "ナイト営業日", night: true });
  day.topics.forEach((text, index) => topics.push({
    key: `topic-${index}`, text: text.replace(/のお誕生日$/, "誕生日"),
  }));
  return topics;
}

export function forecastMonth(forecast: PublicForecast, month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !forecast.months.includes(month))
    throw new Error("公開されている対象月を選んでください。");
  const first = `${month}-01`;
  const last = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0))
    .toISOString().slice(0, 10);
  const dates = datesBetween(first, last);
  const cells = datesBetween(addDays(first, -weekday(first)), addDays(last, 6 - weekday(last)));
  const byDate = new Map(forecast.days.map((day) => [day.date, day]));
  const notices = (["schedule", "fan"] as const).flatMap((key) =>
    (["unpublished", "unconfirmed", "failed"] as const).flatMap((state) => {
      const matches = dates.filter((date) =>
        (byDate.get(date)?.[key] ?? "unconfirmed") === state && byDate.get(date)?.level !== "closed",
      );
      return matches.length ? [{ key: `${key}-${state}`,
        label: `${key === "schedule" ? "スケジュール" : "ファンスタスケジュール"}${state === "unpublished" ? "未公開" : state === "failed" ? "取得遅延" : "公開状況確認中"}`,
        dates: formatDateRanges(matches) }] : [];
    }),
  );
  return { dates, cells, byDate, notices, weekCount: cells.length / 7,
    provisional: dates.some((date) => byDate.get(date)?.provisional),
    ready: dates.every((date) => byDate.has(date) && byDate.get(date)?.level !== "pending"),
  };
}
