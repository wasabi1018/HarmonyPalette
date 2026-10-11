export type CrowdLevel = "normal" | "busy" | "veryBusy";
export type CrowdCalendarOverrides = Record<string, CrowdLevel>;

export type CrowdCalendarAnnotation = {
  note?: string;
  fanStudio?: "show" | "hide";
  hideBirthdays?: boolean;
};
export type CrowdCalendarAnnotations = Record<string, CrowdCalendarAnnotation>;
export type CrowdCalendarLabels = {
  fanStudio: string;
  night: string;
  birthday: string;
  eventStart: string;
  eventEnd: string;
};
export type CrowdCalendarEvent = { id: string; name: string; startDate: string; endDate: string };
export type CrowdCalendarSettings = { labels: CrowdCalendarLabels; events: CrowdCalendarEvent[] };
export type CrowdCalendarDayFacts = { rooms: number[]; night: boolean; closingTime: string | null; birthdays: string[] };
export type CrowdCalendarFacts = Record<string, CrowdCalendarDayFacts>;
export type CrowdCalendarDetail = { key: string; kind: "event" | "fanStudio" | "night" | "birthday" | "note"; text: string };

export const DEFAULT_CROWD_LABELS: CrowdCalendarLabels = {
  fanStudio: "ファンスタ3部屋", night: "ナイト営業", birthday: "誕生日", eventStart: "開始", eventEnd: "最終日",
};
export const CROWD_NOTE_MAX_LENGTH = 80;
export const CROWD_LABEL_MAX_LENGTH = 16;
export const CROWD_EVENT_NAME_MAX_LENGTH = 24;
export const CROWD_EVENT_MAX_COUNT = 32;

export function emptyCrowdSettings(): CrowdCalendarSettings {
  return { labels: { ...DEFAULT_CROWD_LABELS }, events: [] };
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function isCrowdDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const month = crowdMonthDates(value.slice(0, 7));
  return Boolean(month && Number(value.slice(-2)) <= month.dayCount);
}

export function normalizeCrowdAnnotations(month: string, value: unknown): CrowdCalendarAnnotations {
  const result: CrowdCalendarAnnotations = {};
  for (const [date, raw] of Object.entries(objectValue(value))) {
    if (!isCrowdDate(date) || !date.startsWith(`${month}-`)) continue;
    const input = objectValue(raw);
    const annotation: CrowdCalendarAnnotation = {};
    if (typeof input.note === "string" && input.note.trim()) annotation.note = input.note.trim();
    if (input.fanStudio === "show" || input.fanStudio === "hide") annotation.fanStudio = input.fanStudio;
    if (input.hideBirthdays === true) annotation.hideBirthdays = true;
    if (Object.keys(annotation).length) result[date] = annotation;
  }
  return result;
}

export function normalizeCrowdSettings(value: unknown): CrowdCalendarSettings {
  const input = objectValue(value);
  const labels = { ...DEFAULT_CROWD_LABELS };
  const rawLabels = objectValue(input.labels);
  for (const key of Object.keys(labels) as Array<keyof CrowdCalendarLabels>) {
    if (typeof rawLabels[key] === "string" && rawLabels[key].trim()) labels[key] = rawLabels[key].trim();
  }
  const events: CrowdCalendarEvent[] = [];
  if (Array.isArray(input.events)) {
    for (const raw of input.events) {
      const event = objectValue(raw);
      if (typeof event.id !== "string" || !event.id || events.some((entry) => entry.id === event.id)
        || typeof event.name !== "string" || !event.name.trim()
        || !isCrowdDate(event.startDate) || !isCrowdDate(event.endDate) || event.startDate > event.endDate) continue;
      events.push({ id: event.id, name: event.name.trim(), startDate: event.startDate, endDate: event.endDate });
    }
  }
  return { labels, events };
}

// Validate writes instead of silently dropping invalid user input.
export function validateCrowdAnnotations(month: string, value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("日付の表示情報を確認してください。");
  for (const [date, raw] of Object.entries(value)) {
    const entry = objectValue(raw);
    if (!isCrowdDate(date) || !date.startsWith(`${month}-`) || !raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("表示情報の日付を確認してください。");
    if (entry.note !== undefined && (typeof entry.note !== "string" || Array.from(entry.note).length > CROWD_NOTE_MAX_LENGTH)) throw new Error(`自由記載は${CROWD_NOTE_MAX_LENGTH}文字以内で入力してください。`);
    if (entry.fanStudio !== undefined && entry.fanStudio !== "show" && entry.fanStudio !== "hide") throw new Error("ファンスタの表示設定を確認してください。");
    if (entry.hideBirthdays !== undefined && typeof entry.hideBirthdays !== "boolean") throw new Error("誕生日の表示設定を確認してください。");
  }
  return normalizeCrowdAnnotations(month, value);
}

export function validateCrowdSettings(value: unknown): CrowdCalendarSettings {
  const input = objectValue(value);
  const labels = objectValue(input.labels);
  for (const key of Object.keys(DEFAULT_CROWD_LABELS)) {
    if (typeof labels[key] !== "string" || !labels[key].trim() || Array.from(labels[key]).length > CROWD_LABEL_MAX_LENGTH || /[\r\n]/.test(labels[key])) throw new Error(`表示文言は1〜${CROWD_LABEL_MAX_LENGTH}文字で入力してください。`);
  }
  if (!Array.isArray(input.events) || input.events.length > CROWD_EVENT_MAX_COUNT) throw new Error(`イベントは${CROWD_EVENT_MAX_COUNT}件以内で登録してください。`);
  const ids = new Set<string>();
  for (const raw of input.events) {
    const event = objectValue(raw);
    if (typeof event.id !== "string" || !event.id || event.id.length > 80 || ids.has(event.id)) throw new Error("イベントの識別情報を確認してください。");
    ids.add(event.id);
    if (typeof event.name !== "string" || !event.name.trim() || Array.from(event.name).length > CROWD_EVENT_NAME_MAX_LENGTH || /[\r\n]/.test(event.name)) throw new Error(`イベント名は1〜${CROWD_EVENT_NAME_MAX_LENGTH}文字で入力してください。`);
    if (!isCrowdDate(event.startDate) || !isCrowdDate(event.endDate) || event.startDate > event.endDate) throw new Error("イベントの開始日・終了日を確認してください。");
  }
  return normalizeCrowdSettings(value);
}

export function isCrowdNightClosingTime(time: unknown) {
  if (typeof time !== "string") return false;
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(time);
  return Boolean(match && Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] ?? 0) > 17 * 3600);
}

export function buildCrowdCalendarFacts(
  month: string,
  operatingDays: Array<{ date: string; status: string; closingTime: string | null }>,
  schedules: Array<{ date: string; kind: string; sourceId: string; scheduleType: string; location: string; verified: boolean }>,
  birthdays: Array<{ date: string; name: string }>,
): CrowdCalendarFacts {
  const info = crowdMonthDates(month);
  if (!info) return {};
  const facts: CrowdCalendarFacts = {};
  for (let day = 1; day <= info.dayCount; day++) {
    facts[`${month}-${String(day).padStart(2, "0")}`] = { rooms: [], night: false, closingTime: null, birthdays: [] };
  }
  for (const day of operatingDays) {
    if (!facts[day.date] || day.status !== "open") continue;
    facts[day.date].closingTime = day.closingTime;
    facts[day.date].night = isCrowdNightClosingTime(day.closingTime);
  }
  for (const entry of schedules) {
    if (!facts[entry.date] || !entry.verified || entry.kind !== "greeting"
      || !(entry.sourceId === "harmonyland-funstudio" || entry.scheduleType.includes("ファンスタジオ") || entry.location.includes("ファンスタジオ"))) continue;
    const room = Number(entry.location.normalize("NFKC").match(/(\d+)\s*号室/)?.[1]);
    if (room > 0 && !facts[entry.date].rooms.includes(room)) facts[entry.date].rooms.push(room);
  }
  for (const birthday of birthdays) {
    if (facts[birthday.date] && !facts[birthday.date].birthdays.includes(birthday.name)) facts[birthday.date].birthdays.push(birthday.name);
  }
  for (const day of Object.values(facts)) day.rooms.sort((a, b) => a - b);
  return facts;
}

export function crowdCalendarDetails(
  date: string,
  closed: boolean,
  settings: CrowdCalendarSettings,
  annotations: CrowdCalendarAnnotations,
  facts: CrowdCalendarFacts,
): CrowdCalendarDetail[] {
  const result: CrowdCalendarDetail[] = [];
  for (const event of settings.events) {
    if (event.startDate === date) result.push({ key: `${event.id}:start`, kind: "event", text: `${event.name}${settings.labels.eventStart}` });
    if (event.endDate === date) result.push({ key: `${event.id}:end`, kind: "event", text: `${event.name}${settings.labels.eventEnd}` });
  }
  const annotation = annotations[date];
  const day = facts[date];
  if (!closed && (annotation?.fanStudio === "show" || (annotation?.fanStudio !== "hide" && day?.rooms.length === 3))) result.push({ key: "fanStudio", kind: "fanStudio", text: settings.labels.fanStudio });
  if (!closed && day?.night) result.push({ key: "night", kind: "night", text: settings.labels.night });
  if (!annotation?.hideBirthdays) day?.birthdays.forEach((name, index) => result.push({ key: `birthday:${index}`, kind: "birthday", text: `${name}${settings.labels.birthday}` }));
  if (annotation?.note?.trim()) result.push({ key: "note", kind: "note", text: annotation.note.trim() });
  return result;
}

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
