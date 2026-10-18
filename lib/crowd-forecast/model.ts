import holidays from "./holidays.json";
import { roundScore } from "./score";
import {
  LEVELS,
  type DayInput,
  type ForecastConfig,
  type ForecastState,
  type PublicForecast,
  type SavedDay,
  type Weather,
} from "./types";
import {
  addDays,
  datesBetween,
  japanDay,
  minutes,
  monthRange,
  validDate,
  weekday,
} from "./date";
export {
  addDays,
  datesBetween,
  japanDay,
  minutes,
  monthRange,
  validDate,
  weekday,
} from "./date";
export const DEFAULT_CONFIG: ForecastConfig = {
  months: 3,
  weekday: { normal: 25, adjacent: 30, saturday: 60, sunday: 55, holiday: 60 },
  holiday: { three: 8, four: 12, five: 16, six: 20, edgeReduction: 5, cap: 25 },
  hours: { eight: 10, nine: 20, ten: 30, eleven: 40 },
  fan: {
    highRatio: 1.5,
    medium: 3,
    high: 5,
    baselineDate: "2026-10-19",
    baselineSlots: 22,
  },
  weather: {
    clear: 1,
    cloud: 1,
    occasionalRain: 0.95,
    mixedRain: 0.9,
    rain: 0.8,
    heavyRain: 0.65,
  },
  thresholds: { normal: 25, moderate: 50, busy: 70, veryBusy: 90 },
  event: { boundary: 12, weekend: 10, cap: 15 },
  birthdays: {},
  events: [],
  vacations: [],
  publications: [],
  overrides: [],
};
export function emptyState(): ForecastState {
  return {
    config: structuredClone(DEFAULT_CONFIG),
    days: {},
    holidays,
    holidayThrough: Math.max(
      ...Object.keys(holidays).map((d) => Number(d.slice(0, 4))),
    ),
    weatherCache: {},
    updatedAt: null,
    lastAttempt: null,
    error: null,
    history: [],
  };
}
export function validateConfig(value: unknown): ForecastConfig {
  if (!value || typeof value !== "object")
    throw new Error("設定を確認してください。");
  const c = value as ForecastConfig;
  const numeric = (v: unknown, low = 0, high = 100) =>
    typeof v === "number" && Number.isFinite(v) && v >= low && v <= high;
  if (!Number.isInteger(c.months) || !numeric(c.months, 1, 6))
    throw new Error("公開月数は1〜6か月です。");
  for (const group of [c.weekday, c.holiday, c.hours, c.thresholds, c.event])
    if (!group || !Object.values(group).every((v) => numeric(v)))
      throw new Error("加点は0〜100で入力してください。");
  if (
    !c.fan ||
    !numeric(c.fan.highRatio, 1, 10) ||
    !numeric(c.fan.medium) ||
    !numeric(c.fan.high) ||
    !Number.isInteger(c.fan.baselineSlots) ||
    !numeric(c.fan.baselineSlots, 1, 1000) ||
    !validDate(c.fan.baselineDate)
  )
    throw new Error("ファンスタの比較設定を確認してください。");
  if (
    !c.weather ||
    ![
      "clear",
      "cloud",
      "occasionalRain",
      "mixedRain",
      "rain",
      "heavyRain",
    ].every((k) => numeric(c.weather[k as keyof typeof c.weather], 0, 1))
  )
    throw new Error("天気係数は0〜1です。");
  const t = c.thresholds;
  if (!(t.normal < t.moderate && t.moderate < t.busy && t.busy < t.veryBusy))
    throw new Error("混雑レベルの境界は昇順にしてください。");
  if (!(
    c.hours.eight <= c.hours.nine &&
    c.hours.nine <= c.hours.ten &&
    c.hours.ten <= c.hours.eleven
  ))
    throw new Error("営業時間の加点は昇順にしてください。");
  if (
    !c.birthdays ||
    Object.keys(c.birthdays).length > 500 ||
    !Object.values(c.birthdays).every((v) => [0, 5, 10].includes(v))
  )
    throw new Error("誕生日は0・5・10点で設定してください。");
  for (const list of [c.events, c.vacations, c.publications]) {
    if (!Array.isArray(list) || list.length > 200)
      throw new Error("期間設定が多すぎます。");
    for (const p of list)
      if (
        !p ||
        !validDate(p.from) ||
        !validDate(p.to) ||
        p.from > p.to ||
        typeof p.name !== "string" ||
        p.name.length > 80 ||
        typeof p.id !== "string"
      )
        throw new Error("期間の名称・開始日・終了日を確認してください。");
  }
  if (c.vacations.some((p) => !numeric(p.points)))
    throw new Error("休暇加点を確認してください。");
  if (
    c.publications.some(
      (p) =>
        !["published", "unpublished", "unconfirmed", "failed"].includes(
          p.schedule,
        ) ||
        !["published", "unpublished", "unconfirmed", "failed"].includes(p.fan),
    )
  )
    throw new Error("公開状況を確認してください。");
  if (!Array.isArray(c.overrides) || c.overrides.length > 400)
    throw new Error("日別調整が多すぎます。");
  const seen = new Set<string>();
  for (const p of c.overrides) {
    if (
      !validDate(p.date) ||
      seen.has(p.date) ||
      !numeric(p.points, -100, 100) ||
      !["", ...LEVELS].includes(p.level) ||
      !["", ...Object.keys(c.weather)].includes(p.weather) ||
      typeof p.reason !== "string" ||
      !p.reason.trim() ||
      p.reason.length > 120 ||
      typeof p.note !== "string" ||
      p.note.length > 500
    )
      throw new Error("日別調整は重複のない日付と理由が必要です。");
    seen.add(p.date);
  }
  // Copy only known properties; arbitrary JSON is never persisted or reflected.
  return JSON.parse(
    JSON.stringify({
      months: c.months,
      weekday: c.weekday,
      holiday: c.holiday,
      hours: c.hours,
      fan: c.fan,
      weather: c.weather,
      thresholds: c.thresholds,
      event: c.event,
      birthdays: c.birthdays,
      events: c.events,
      vacations: c.vacations,
      publications: c.publications,
      overrides: c.overrides,
    }),
  );
}
function isHoliday(date: string, h: Record<string, string>) {
  return [0, 6].includes(weekday(date)) || !!h[date];
}
export function holidayPoints(
  date: string,
  c: ForecastConfig,
  h: Record<string, string>,
) {
  if (!isHoliday(date, h)) return 0;
  let from = date,
    to = date;
  while (isHoliday(addDays(from, -1), h)) from = addDays(from, -1);
  while (isHoliday(addDays(to, 1), h)) to = addDays(to, 1);
  const n = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
  const p =
    n >= 6
      ? c.holiday.six
      : n === 5
        ? c.holiday.five
        : n === 4
          ? c.holiday.four
          : n === 3
            ? c.holiday.three
            : 0;
  return Math.max(
    0,
    p -
      (n >= 3 && (date === from || date === to) ? c.holiday.edgeReduction : 0),
  );
}
export function levelFor(score: number, c: ForecastConfig) {
  return score >= c.thresholds.veryBusy
    ? "veryBusy"
    : score >= c.thresholds.busy
      ? "busy"
      : score >= c.thresholds.moderate
        ? "moderate"
        : score >= c.thresholds.normal
          ? "normal"
          : "quiet";
}
export function weatherUsable(w: Weather | null, date: string, now: Date) {
  return !!w && w.date === date && Date.parse(w.validUntil) > now.getTime();
}
export function calculate(
  input: DayInput,
  c: ForecastConfig,
  h: Record<string, string>,
  weather: Weather | null,
  now = new Date(),
): SavedDay {
  const { date } = input,
    day = weekday(date),
    override = c.overrides.find((o) => o.date === date);
  const adjacent =
    isHoliday(addDays(date, -1), h) || isHoliday(addDays(date, 1), h);
  const base = h[date]
    ? c.weekday.holiday
    : day === 6
      ? c.weekday.saturday
      : day === 0
        ? c.weekday.sunday
        : adjacent
          ? c.weekday.adjacent
          : c.weekday.normal;
  const vacation = Math.max(
    0,
    ...c.vacations
      .filter((p) => p.from <= date && date <= p.to)
      .map((p) => p.points),
  );
  const calendar = Math.min(
    c.holiday.cap,
    holidayPoints(date, c, h) + vacation,
  );
  const events = c.events
    .filter((p) => p.from <= date && date <= p.to)
    .map((p) => {
      const firstSat = datesBetween(p.from, addDays(p.from, 6)).find(
        (d) => weekday(d) === 6,
      )!;
      const lastSun = datesBetween(addDays(p.to, -6), p.to).find(
        (d) => weekday(d) === 0,
      )!;
      const boundary = date === p.from || date === p.to;
      const weekend = [
        firstSat,
        addDays(firstSat, 1),
        lastSun,
        addDays(lastSun, -1),
      ].includes(date);
      return {
        name: p.name,
        points: Math.max(
          boundary ? c.event.boundary : 0,
          weekend ? c.event.weekend : 0,
        ),
      };
    });
  const event = Math.min(
    c.event.cap,
    Math.max(0, ...events.map((p) => p.points)),
  );
  const duration =
    input.opening && input.closing
      ? (minutes(input.closing) - minutes(input.opening)) / 60
      : 0;
  const hours =
    duration >= 11
      ? c.hours.eleven
      : duration >= 10
        ? c.hours.ten
        : duration >= 9
          ? c.hours.nine
          : duration >= 8
            ? c.hours.eight
            : 0;
  const ratio =
    input.fan === "published"
      ? input.slots / c.fan.baselineSlots
      : 0;
  const fan =
    ratio >= c.fan.highRatio
      ? c.fan.high
      : ratio >= 1
        ? c.fan.medium
        : 0;
  const birthday = Math.max(
    0,
    ...input.birthdays.map(
      (b) => c.birthdays[b.id] ?? (b.name === "クロミ" ? 10 : 0),
    ),
  );
  const basic =
    base + calendar + event + Math.max(hours, fan) + (override?.points ?? 0);
  const age = Math.round(
    (Date.parse(date) - Date.parse(japanDay(now))) / 86400000,
  );
  const savedWeather = weatherUsable(weather, date, now) ? weather : null;
  const factor =
    1 +
    ((override?.weather
      ? c.weather[override.weather]
      : savedWeather
        ? c.weather[savedWeather.kind]
        : 1) -
      1) *
      (age <= 2 ? 1 : age <= 6 ? 0.5 : 0);
  const raw = (basic + birthday) * factor,
    score = roundScore(raw);
  const missing =
    input.status === "unknown" ||
    input.schedule !== "published" ||
    input.fan !== "published";
  const unavailable = input.status === "unknown";
  return {
    provisional: input.status === "open" && missing && !override?.level,
    input,
    weather: savedWeather,
    updatedAt: now.toISOString(),
    level:
      input.status === "closed"
        ? "closed"
        : override?.level || (unavailable ? "pending" : levelFor(score, c)),
    fallbackLevel:
      input.status === "closed"
        ? "closed"
        : override?.level ||
          (unavailable
            ? "pending"
            : levelFor(
                override?.weather
                  ? score
                  : Math.max(0, basic + birthday),
                c,
              )),
    score:
      input.status === "closed" || override?.level || unavailable
        ? null
        : score,
    raw:
      input.status === "closed" || override?.level || unavailable ? null : raw,
    basic,
    factor,
    breakdown: {
      weekday: base,
      calendar,
      event,
      hours,
      fan,
      birthday,
      manual: override?.points ?? 0,
    },
    topics: [
      ...input.birthdays.map((b) => `${b.name}のお誕生日`),
      ...c.events.flatMap(({ name, from, to }) => [
        ...(date === from ? [`${name}開始`] : []),
        ...(date === to ? [`${name}終了`] : []),
      ]),
      ...(override?.reason ? [override.reason] : []),
    ],
    threeRooms:
      input.fan === "published" &&
      input.rooms.length === 3 &&
      input.slots > c.fan.baselineSlots,
  };
}
export function pruneState(s: ForecastState, today: string): ForecastState {
  const start = `${today.slice(0, 7)}-01`,
    allowed = new Set(monthRange(today, s.config.months));
  return {
    ...s,
    days: Object.fromEntries(
      Object.entries(s.days).filter(
        ([d]) => d >= start && allowed.has(d.slice(0, 7)),
      ),
    ),
    weatherCache: Object.fromEntries(
      Object.entries(s.weatherCache)
        .map(([url, ws]) => [
          url,
          ws.filter((w) => w.date >= start && allowed.has(w.date.slice(0, 7))),
        ])
        .filter(([, ws]) => ws.length),
    ),
  };
}
export function projectPublic(
  s: ForecastState,
  now = new Date(),
): PublicForecast {
  const today = japanDay(now),
    months = monthRange(today, s.config.months);
  return {
    today,
    months,
    holidays: Object.fromEntries(
      Object.entries(s.holidays).filter(([date]) =>
        months.includes(date.slice(0, 7)),
      ),
    ),
    updatedAt: s.updatedAt,
    delayed:
      !!s.error ||
      Object.values(s.days).some(
        (d) =>
          d.input.date >= today &&
          d.weather &&
          !weatherUsable(d.weather, d.input.date, now),
      ),
    days: Object.entries(s.days)
      .filter(([date]) => months.includes(date.slice(0, 7)))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({
        date,
        provisional: d.provisional,
        level:
          date >= today && d.weather && !weatherUsable(d.weather, date, now)
            ? d.fallbackLevel
            : d.level,
        opening: d.input.opening,
        closing: d.input.closing,
        schedule: d.input.schedule,
        fan: d.input.fan,
        topics: d.topics,
        threeRooms: d.threeRooms,
        updatedAt: d.updatedAt,
        archived: date < today,
        weather:
          date < today
            ? d.weather
            : weatherUsable(d.weather, date, now)
              ? d.weather
              : null,
      })),
  };
}
/** Preserve today and earlier. Settings saves reuse weather; only the daily worker supplies new weather. */
export function mergeForUpdate(
  s: ForecastState,
  inputs: DayInput[],
  weather: Record<string, Weather> | null,
  now: Date,
): ForecastState {
  const today = japanDay(now),
    days = { ...s.days };
  for (const input of inputs) {
    if (input.date <= today) continue;
    days[input.date] = calculate(
      input,
      s.config,
      s.holidays,
      weather
        ? (weather[input.date] ?? null)
        : (days[input.date]?.weather ?? null),
      now,
    );
  }
  return pruneState({ ...s, days, updatedAt: now.toISOString() }, today);
}
