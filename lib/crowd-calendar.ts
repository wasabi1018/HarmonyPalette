export type CrowdLevel = "normal" | "busy" | "veryBusy";
export type CrowdCalendarOverrides = Record<string, CrowdLevel>;

export type CrowdCalendarCell = {
  date: string;
  day: number;
  inMonth: boolean;
  level: CrowdLevel | "closed" | null;
};

export type CrowdCalendarMonth = {
  key: string;
  year: number;
  month: number;
  dayCount: number;
  weekCount: number;
  cells: CrowdCalendarCell[];
};

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function isCrowdMonth(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = MONTH_PATTERN.exec(value);
  return Boolean(match && Number(match[1]) >= 2000 && Number(match[1]) <= 2100);
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function crowdMonthDates(month: string) {
  if (!isCrowdMonth(month)) return null;
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const dayCount = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { year, month: monthNumber, first, dayCount };
}

export function normalizeCrowdOverrides(month: string, value: unknown): CrowdCalendarOverrides {
  const monthInfo = crowdMonthDates(month);
  if (!monthInfo || !value || typeof value !== "object" || Array.isArray(value)) return {};

  const result: CrowdCalendarOverrides = {};
  for (const [date, level] of Object.entries(value)) {
    if (
      DATE_PATTERN.test(date)
      && date.startsWith(`${month}-`)
      && Number(date.slice(-2)) <= monthInfo.dayCount
      && (level === "busy" || level === "veryBusy")
    ) result[date] = level;
  }
  return result;
}

export function crowdOverridesEqual(left: CrowdCalendarOverrides, right: CrowdCalendarOverrides) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key) => left[key] === right[key]);
}

export function buildCrowdCalendarMonth(
  month: string,
  overrides: CrowdCalendarOverrides = {},
  closedDates: ReadonlySet<string> = new Set(),
): CrowdCalendarMonth | null {
  const monthInfo = crowdMonthDates(month);
  if (!monthInfo) return null;

  const { year, month: monthNumber, first, dayCount } = monthInfo;
  const leadingDays = first.getUTCDay();
  const weekCount = Math.ceil((leadingDays + dayCount) / 7);
  const gridStart = new Date(first);
  gridStart.setUTCDate(1 - leadingDays);
  const normalizedOverrides = normalizeCrowdOverrides(month, overrides);

  const cells = Array.from({ length: weekCount * 7 }, (_, index) => {
    const dateObject = new Date(gridStart);
    dateObject.setUTCDate(gridStart.getUTCDate() + index);
    const date = isoDate(dateObject);
    const inMonth = dateObject.getUTCFullYear() === year
      && dateObject.getUTCMonth() === monthNumber - 1;
    return {
      date,
      day: dateObject.getUTCDate(),
      inMonth,
      level: !inMonth ? null : closedDates.has(date) ? "closed" : normalizedOverrides[date] ?? "normal",
    } satisfies CrowdCalendarCell;
  });

  return { key: month, year, month: monthNumber, dayCount, weekCount, cells };
}
