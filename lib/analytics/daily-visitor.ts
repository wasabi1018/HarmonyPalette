export const DAILY_VISITOR_STORAGE_KEY = "harmony-palette:daily-visitor";

export type DailyVisitorState = {
  version: 1;
  date: string;
  token: string;
  recorded: boolean;
};

type StorageLike = Pick<Storage, "getItem" | "setItem">;

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function japanCalendarDate(value = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function isDailyVisitorToken(value: unknown): value is string {
  return typeof value === "string" && UUID_V4_PATTERN.test(value);
}

export function parseDailyVisitorState(
  value: string | null,
  currentDate: string,
): DailyVisitorState | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<DailyVisitorState>;
    if (
      parsed.version !== 1
      || parsed.date !== currentDate
      || !isDailyVisitorToken(parsed.token)
      || typeof parsed.recorded !== "boolean"
    ) {
      return null;
    }
    return {
      version: 1,
      date: parsed.date,
      token: parsed.token,
      recorded: parsed.recorded,
    };
  } catch {
    return null;
  }
}

export function getOrCreateDailyVisitorState(
  storage: StorageLike,
  currentDate: string,
  createToken: () => string,
) {
  const existing = parseDailyVisitorState(
    storage.getItem(DAILY_VISITOR_STORAGE_KEY),
    currentDate,
  );
  if (existing) return existing;

  const token = createToken();
  if (!isDailyVisitorToken(token)) {
    throw new Error("Daily visitor token generation failed");
  }
  const created: DailyVisitorState = {
    version: 1,
    date: currentDate,
    token,
    recorded: false,
  };
  storage.setItem(DAILY_VISITOR_STORAGE_KEY, JSON.stringify(created));
  return created;
}

export function markDailyVisitorRecorded(
  storage: StorageLike,
  expected: DailyVisitorState,
) {
  const current = parseDailyVisitorState(
    storage.getItem(DAILY_VISITOR_STORAGE_KEY),
    expected.date,
  );
  if (!current || current.token !== expected.token) return false;

  storage.setItem(DAILY_VISITOR_STORAGE_KEY, JSON.stringify({
    ...current,
    recorded: true,
  } satisfies DailyVisitorState));
  return true;
}
