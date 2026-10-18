export const LEVELS = [
  "quiet",
  "normal",
  "moderate",
  "busy",
  "veryBusy",
] as const;
export type CrowdLevel = (typeof LEVELS)[number];
export const LEVEL_LABELS: Record<CrowdLevel | "closed" | "pending", string> = {
  quiet: "ゆったり",
  normal: "普通",
  moderate: "やや混雑",
  busy: "混雑",
  veryBusy: "大混雑",
  closed: "休園日",
  pending: "予想準備中",
};
export type Publication =
  "published" | "unpublished" | "unconfirmed" | "failed";
export type WeatherKind =
  "clear" | "cloud" | "occasionalRain" | "mixedRain" | "rain" | "heavyRain";
export type Weather = {
  date: string;
  text: string;
  kind: WeatherKind;
  region: string;
  station: string;
  high: number | null;
  low: number | null;
  rain: { from: number; to: number; probability: number }[];
  dailyRain: number | null;
  issuedAt: string;
  fetchedAt: string;
  validUntil: string;
  sourceUrl: string;
};
export type Period = { id: string; name: string; from: string; to: string };
export type Override = {
  date: string;
  points: number;
  level: CrowdLevel | "";
  reason: string;
  note: string;
  weather: WeatherKind | "";
};
export type ForecastConfig = {
  months: number;
  weekday: {
    normal: number;
    adjacent: number;
    saturday: number;
    sunday: number;
    holiday: number;
  };
  holiday: {
    three: number;
    four: number;
    five: number;
    six: number;
    edgeReduction: number;
    cap: number;
  };
  hours: { eight: number; nine: number; ten: number; eleven: number };
  fan: {
    highRatio: number;
    medium: number;
    high: number;
    baselineDate: string;
    baselineSlots: number;
  };
  weather: Record<WeatherKind, number>;
  thresholds: {
    normal: number;
    moderate: number;
    busy: number;
    veryBusy: number;
  };
  event: { boundary: number; weekend: number; cap: number };
  birthdays: Record<string, 0 | 5 | 10>;
  events: Period[];
  vacations: (Period & { points: number })[];
  publications: (Period & { schedule: Publication; fan: Publication })[];
  overrides: Override[];
};
export type DayInput = {
  date: string;
  status: "open" | "closed" | "unknown";
  opening: string | null;
  closing: string | null;
  schedule: Publication;
  fan: Publication;
  slots: number;
  rooms: number[];
  baselineDensities: number[];
  birthdays: { id: string; name: string }[];
};
export type SavedDay = {
  provisional: boolean;
  input: DayInput;
  weather: Weather | null;
  updatedAt: string;
  level: CrowdLevel | "closed" | "pending";
  score: number | null;
  fallbackLevel: CrowdLevel | "closed" | "pending";
  raw: number | null;
  basic: number;
  factor: number;
  breakdown: Record<string, number>;
  topics: string[];
  threeRooms: boolean;
};
export type ForecastState = {
  config: ForecastConfig;
  days: Record<string, SavedDay>;
  holidays: Record<string, string>;
  holidayThrough: number;
  weatherCache: Record<string, Weather[]>;
  updatedAt: string | null;
  lastAttempt: string | null;
  error: string | null;
  history: { at: string; config: ForecastConfig }[];
};
/** Deliberately separate DTO: never spread a private SavedDay into a public response. */
export type PublicDay = {
  provisional?: boolean;
  date: string;
  level: SavedDay["level"];
  opening: string | null;
  closing: string | null;
  schedule: Publication;
  fan: Publication;
  threeRooms: boolean;
  topics: string[];
  weather: Weather | null;
  updatedAt: string;
  archived: boolean;
};
export type PublicForecast = {
  today: string;
  months: string[];
  holidays: Record<string, string>;
  days: PublicDay[];
  updatedAt: string | null;
  delayed: boolean;
};
