import type { Override } from "./types";

export type DailyAdjustment = {
  id: string;
  dates: string[];
  values: Omit<Override, "date">;
};

// Keep the stored/API format date-based. Include private notes when grouping so
// visually similar adjustments never overwrite different internal information.
export function groupDailyAdjustments(overrides: Override[]): DailyAdjustment[] {
  const groups = new Map<string, DailyAdjustment>();
  for (const [index, { date, ...values }] of overrides.entries()) {
    const key = JSON.stringify([
      values.points,
      values.level,
      values.weather,
      values.reason,
      values.note,
    ]);
    const existing = groups.get(key);
    if (existing) existing.dates.push(date);
    else groups.set(key, { id: `saved-${index}`, dates: [date], values });
  }
  return [...groups.values()].map((group) => ({
    ...group,
    dates: group.dates.sort(),
  }));
}

export function expandDailyAdjustments(groups: DailyAdjustment[]): Override[] {
  return groups.flatMap(({ dates, values }) =>
    // An unfinished item must fail validation, never disappear during saving.
    (dates.length ? dates : [""]).map((date) => ({ date, ...values })),
  );
}
