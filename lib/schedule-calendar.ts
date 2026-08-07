export type ScheduleCalendarMonth = {
  key: string;
  year: number;
  month: number;
  label: string;
  dates: ScheduleCalendarDate[];
};

export type ScheduleCalendarDate = {
  date: string;
  day: number;
  isInMonth: boolean;
  isInRange: boolean;
};

const CALENDAR_CELL_COUNT = 42;

function parseCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) return null;

  return { year, month, day };
}

function formatCalendarDate(date: Date) {
  return [
    String(date.getUTCFullYear()).padStart(4, "0"),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function monthKey(year: number, month: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

export function getScheduleCalendarMonthKeys(fromDate: string, toDate: string) {
  const from = parseCalendarDate(fromDate);
  const to = parseCalendarDate(toDate);
  if (!from || !to || fromDate > toDate) return [];

  const keys: string[] = [];
  let year = from.year;
  let month = from.month;
  while (year < to.year || (year === to.year && month <= to.month)) {
    keys.push(monthKey(year, month));
    month += 1;
    if (month > 12) {
      year += 1;
      month = 1;
    }
  }
  return keys;
}

export function buildScheduleCalendarMonth(
  key: string,
  fromDate: string,
  toDate: string,
): ScheduleCalendarMonth | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;

  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const gridStart = new Date(firstDay);
  gridStart.setUTCDate(gridStart.getUTCDate() - firstDay.getUTCDay());

  const dates = Array.from({ length: CALENDAR_CELL_COUNT }, (_, index) => {
    const value = new Date(gridStart);
    value.setUTCDate(value.getUTCDate() + index);
    const date = formatCalendarDate(value);
    return {
      date,
      day: value.getUTCDate(),
      isInMonth: value.getUTCFullYear() === year && value.getUTCMonth() === month - 1,
      isInRange: date >= fromDate && date <= toDate,
    };
  });

  return {
    key,
    year,
    month,
    label: `${year}年${month}月`,
    dates,
  };
}
