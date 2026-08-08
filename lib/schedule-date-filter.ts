export type ScheduleDateRangeEntry = {
  date: string;
  endDate?: string;
};

export function isScheduleInDateRange(
  entry: ScheduleDateRangeEntry,
  rangeStart: string,
  rangeEnd: string,
) {
  return (!rangeStart || (entry.endDate ?? entry.date) >= rangeStart)
    && (!rangeEnd || entry.date <= rangeEnd);
}
