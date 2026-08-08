export type ScheduleEventOptionEntry = {
  title: string;
  date: string;
  endDate?: string;
};

export type ScheduleEventOptionState = {
  name: string;
  endDate: string;
  isEnded: boolean;
};

export function buildScheduleEventOptionStates<T extends ScheduleEventOptionEntry>(
  entries: readonly T[],
  today: string,
  getOptionName: (entry: T) => string | null,
) {
  const latestEndDates = new Map<string, string>();

  entries.forEach((entry) => {
    const name = getOptionName(entry)?.trim();
    if (!name) return;

    const endDate = entry.endDate ?? entry.date;
    const currentEndDate = latestEndDates.get(name);
    if (!currentEndDate || endDate > currentEndDate) latestEndDates.set(name, endDate);
  });

  return Array.from(latestEndDates, ([name, endDate]) => ({
    name,
    endDate,
    isEnded: endDate < today,
  })).sort((left, right) => left.name.localeCompare(right.name, "ja"));
}
