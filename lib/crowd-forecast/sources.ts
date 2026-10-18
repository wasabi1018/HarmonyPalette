import "server-only";
import {
  getPublishedParkOperatingDays,
  getPublishedSchedules,
} from "@/lib/supabase/schedule-repository";
import { getRegisteredCharacters } from "@/lib/supabase/character-repository";
import { addDays, datesBetween, minutes, monthRange, weekday } from "./model";
import type { DayInput, ForecastState } from "./types";

export async function loadInputs(
  s: ForecastState,
  today: string,
): Promise<DayInput[]> {
  const months = monthRange(today, s.config.months),
    first = `${months[0]}-01`;
  const lastMonth = months.at(-1)!;
  const to = new Date(
    Date.UTC(Number(lastMonth.slice(0, 4)), Number(lastMonth.slice(5, 7)), 0),
  )
    .toISOString()
    .slice(0, 10);
  if (Number(to.slice(0, 4)) > s.holidayThrough)
    throw new Error(
      "祝日データの対象年を超えています。内閣府の祝日データを更新してください。",
    );
  const from = addDays(first, -56);
  const [rows, operations, characters] = await Promise.all([
    getPublishedSchedules(from, to),
    getPublishedParkOperatingDays(from, to),
    getRegisteredCharacters(),
  ]);
  if (!rows || !operations || !characters)
    throw new Error("スケジュールの取得設定を確認してください。");
  const verified = rows.filter((r) => r.verification_status === "verified");
  const fanRows = verified.filter(
    (r) =>
      r.kind === "greeting" &&
      (r.source_id === "harmonyland-funstudio" ||
        r.schedule_type.includes("ファンスタジオ") ||
        r.location.includes("ファンスタジオ")),
  );
  const fanIds = new Set(fanRows.map((r) => r.id));
  const facts = new Map<string, DayInput>();
  for (const date of datesBetween(from, to)) {
    const op = operations.find((o) => o.operation_date === date);
    const fan = fanRows.filter((r) => r.event_date === date);
    const slots = new Set<string>(),
      rooms = new Set<number>();
    for (const row of fan) {
      const room = row.location.normalize("NFKC").match(/(\d+)\s*号室/)?.[1];
      if (room && row.start_time) {
        rooms.add(Number(room));
        slots.add(`${room}:${row.start_time.slice(0, 5)}`);
      }
    }
    const declaration = s.config.publications
      .filter((p) => p.from <= date && date <= p.to)
      .at(-1);
    facts.set(date, {
      date,
      status:
        op?.operating_status === "open"
          ? "open"
          : op?.operating_status === "closed"
            ? "closed"
            : "unknown",
      opening: op?.opening_time?.slice(0, 5) ?? null,
      closing: op?.closing_time?.slice(0, 5) ?? null,
      schedule:
        declaration?.schedule ??
        (verified.some(
          (r) =>
            !fanIds.has(r.id) &&
            r.event_date <= date &&
            (r.end_date ?? r.event_date) >= date,
        )
          ? "published"
          : "unconfirmed"),
      fan: declaration?.fan ?? (fan.length ? "published" : "unconfirmed"),
      slots: slots.size,
      rooms: [...rooms].sort((a, b) => a - b),
      baselineDensities: [],
      birthdays: characters
        .filter(
          (c) =>
            c.birthdayMonth === Number(date.slice(5, 7)) &&
            c.birthdayDay === Number(date.slice(8, 10)),
        )
        .map((c) => ({ id: c.id, name: c.name })),
    });
  }
  const category = (d: string) =>
    s.holidays[d] ? "holiday" : String(weekday(d));
  for (const input of facts.values()) {
    for (const date of datesBetween(
      addDays(input.date, -56),
      addDays(input.date, -1),
    )) {
      const previous = facts.get(date);
      if (
        !previous ||
        category(previous.date) !== category(input.date) ||
        previous.status !== "open" ||
        previous.fan !== "published" ||
        !previous.opening ||
        !previous.closing ||
        !previous.slots
      )
        continue;
      const duration =
        (minutes(previous.closing) - minutes(previous.opening)) / 60;
      if (duration > 0) input.baselineDensities.push(previous.slots / duration);
    }
  }
  return [...facts.values()].filter((d) => d.date >= first);
}
