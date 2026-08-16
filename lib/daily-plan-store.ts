"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  DEFAULT_CUSTOM_PLAN_COLOR,
  isCustomPlanColor,
  type CustomPlanColor,
} from "@/lib/plan-options";
import { getEntryCharacterNames, getScheduleSourceKey, type ScheduleEntry } from "@/lib/schedule-store";
import { recordSiteAnalyticsEvent } from "@/lib/site-analytics";

export type PlanItemKind = "official" | "custom";
export type OfficialPlanSyncStatus = "current" | "updated" | "missing" | "needs-review";

export type DailyPlanItem = {
  id: string;
  kind: PlanItemKind;
  sourceScheduleId?: string;
  sourceScheduleKey?: string;
  sourceUpdatedAt?: string;
  syncStatus?: OfficialPlanSyncStatus;
  title: string;
  characterNames: string[];
  scheduleType?: string;
  startTime: string;
  endTime: string;
  location: string;
  note: string;
  accentColor?: CustomPlanColor;
  timeLocked: boolean;
  createdAt: string;
};

export type DailyPlan = {
  date: string;
  items: DailyPlanItem[];
  updatedAt: string;
};

type StoredDailyPlanState = {
  version: 2;
  plans: Record<string, DailyPlan>;
};

export type CustomPlanItemInput = {
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  note?: string;
  accentColor: CustomPlanColor;
};

const STORAGE_KEY = "harmony-palette:my-plans:v1";
const CHANGE_EVENT = "harmony-palette:my-plans-change";
const EMPTY_STATE: StoredDailyPlanState = { version: 2, plans: {} };
const EMPTY_STATE_JSON = JSON.stringify(EMPTY_STATE);

function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function timeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return (hour * 60) + minute;
}

export function minutesToTime(value: number) {
  const minutes = Math.max(0, Math.min((24 * 60) - 1, Math.round(value)));
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function normalizedItem(value: unknown): DailyPlanItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<DailyPlanItem>;
  if (
    typeof item.id !== "string"
    || (item.kind !== "official" && item.kind !== "custom")
    || typeof item.title !== "string"
    || !isTime(item.startTime)
    || !isTime(item.endTime)
  ) {
    return null;
  }

  return {
    id: item.id,
    kind: item.kind,
    sourceScheduleId: typeof item.sourceScheduleId === "string" ? item.sourceScheduleId : undefined,
    sourceScheduleKey: typeof item.sourceScheduleKey === "string" ? item.sourceScheduleKey : undefined,
    sourceUpdatedAt: typeof item.sourceUpdatedAt === "string" ? item.sourceUpdatedAt : undefined,
    syncStatus: item.syncStatus === "current"
      || item.syncStatus === "updated"
      || item.syncStatus === "missing"
      || item.syncStatus === "needs-review"
      ? item.syncStatus
      : undefined,
    title: item.title,
    characterNames: Array.isArray(item.characterNames)
      ? item.characterNames.filter((name): name is string => typeof name === "string")
      : [],
    scheduleType: typeof item.scheduleType === "string" ? item.scheduleType : undefined,
    startTime: item.startTime,
    endTime: item.endTime,
    location: typeof item.location === "string" ? item.location : "",
    note: typeof item.note === "string" ? item.note : "",
    accentColor: item.kind === "custom" && isCustomPlanColor(item.accentColor)
      ? item.accentColor
      : item.kind === "custom"
        ? DEFAULT_CUSTOM_PLAN_COLOR
        : undefined,
    timeLocked: item.kind === "official" || item.timeLocked === true,
    createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date(0).toISOString(),
  };
}

function parseState(raw: string | null): StoredDailyPlanState {
  if (!raw) return EMPTY_STATE;

  try {
    const value = JSON.parse(raw) as Partial<StoredDailyPlanState>;
    if (!value.plans || typeof value.plans !== "object") return EMPTY_STATE;

    const plans = Object.entries(value.plans).reduce<Record<string, DailyPlan>>((result, [date, planValue]) => {
      if (!isDate(date) || !planValue || typeof planValue !== "object") return result;
      const plan = planValue as Partial<DailyPlan>;
      const items = Array.isArray(plan.items)
        ? plan.items.map(normalizedItem).filter((item): item is DailyPlanItem => item !== null)
        : [];
      result[date] = {
        date,
        items: sortPlanItems(items),
        updatedAt: typeof plan.updatedAt === "string" ? plan.updatedAt : new Date(0).toISOString(),
      };
      return result;
    }, {});

    return { version: 2, plans };
  } catch {
    return EMPTY_STATE;
  }
}

function getSnapshot() {
  if (typeof window === "undefined") return EMPTY_STATE_JSON;
  return window.localStorage.getItem(STORAGE_KEY) ?? EMPTY_STATE_JSON;
}

function getServerSnapshot() {
  return EMPTY_STATE_JSON;
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(CHANGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function writeState(state: StoredDailyPlanState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function readState() {
  return parseState(window.localStorage.getItem(STORAGE_KEY));
}

function sortPlanItems(items: DailyPlanItem[]) {
  return [...items].sort((left, right) => {
    const byTime = left.startTime.localeCompare(right.startTime);
    return byTime || left.createdAt.localeCompare(right.createdAt);
  });
}

function updatePlan(date: string, transform: (items: DailyPlanItem[]) => DailyPlanItem[]) {
  const state = readState();
  const current = state.plans[date]?.items ?? [];
  const nextItems = sortPlanItems(transform(current));
  const nextPlans = { ...state.plans };

  if (nextItems.length === 0) {
    delete nextPlans[date];
  } else {
    nextPlans[date] = {
      date,
      items: nextItems,
      updatedAt: new Date().toISOString(),
    };
  }

  writeState({ version: 2, plans: nextPlans });
  return nextPlans[date];
}

function createId(prefix: string) {
  const suffix = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}:${suffix}`;
}

function normalizedEndTime(startTime: string, endTime?: string) {
  if (endTime && isTime(endTime) && timeToMinutes(endTime) > timeToMinutes(startTime)) return endTime;
  return minutesToTime(timeToMinutes(startTime) + 30);
}

export function useDailyPlans() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const state = useMemo(() => parseState(raw), [raw]);
  return state.plans;
}

export function addScheduleToPlan(entry: ScheduleEntry, targetDate: string) {
  if (!isDate(targetDate)) throw new Error("追加先の日付が正しくありません。");
  const state = readState();
  const sourceScheduleKey = getScheduleSourceKey(entry);
  const existing = state.plans[targetDate]?.items.find((item) => item.sourceScheduleId === entry.id
    || (sourceScheduleKey && item.sourceScheduleKey === sourceScheduleKey));
  if (existing) return { status: "exists" as const, item: existing };
  const createsNewPlan = (state.plans[targetDate]?.items.length ?? 0) === 0;

  const createdAt = new Date().toISOString();
  const item: DailyPlanItem = {
    id: createId("official"),
    kind: "official",
    sourceScheduleId: entry.id,
    sourceScheduleKey,
    sourceUpdatedAt: entry.updatedAt,
    syncStatus: "current",
    title: entry.title,
    characterNames: getEntryCharacterNames(entry),
    scheduleType: entry.scheduleType,
    startTime: entry.startTime,
    endTime: normalizedEndTime(entry.startTime, entry.endTime),
    location: entry.location,
    note: "",
    timeLocked: true,
    createdAt,
  };
  updatePlan(targetDate, (items) => [...items, item]);
  if (createsNewPlan) void recordSiteAnalyticsEvent("plan_created").catch(() => undefined);
  return { status: "added" as const, item };
}

export function removeScheduleFromPlan(date: string, scheduleId: string) {
  if (!isDate(date)) throw new Error("取り消し先の日付が正しくありません。");
  const state = readState();
  const existing = state.plans[date]?.items.find((item) => item.sourceScheduleId === scheduleId);
  if (!existing) return false;
  updatePlan(date, (items) => items.filter((item) => item.sourceScheduleId !== scheduleId));
  return true;
}

export function addCustomPlanItem(date: string, input: CustomPlanItemInput) {
  if (!isDate(date)) throw new Error("追加先の日付が正しくありません。");
  if (!input.title.trim()) throw new Error("予定名を入力してください。");
  if (!isTime(input.startTime) || !isTime(input.endTime)) throw new Error("時刻が正しくありません。");
  if (timeToMinutes(input.endTime) <= timeToMinutes(input.startTime)) {
    throw new Error("終了時刻は開始時刻より後にしてください。");
  }
  const state = readState();
  const createsNewPlan = (state.plans[date]?.items.length ?? 0) === 0;

  const item: DailyPlanItem = {
    id: createId("custom"),
    kind: "custom",
    title: input.title.trim(),
    characterNames: [],
    startTime: input.startTime,
    endTime: input.endTime,
    location: input.location?.trim() ?? "",
    note: input.note?.trim() ?? "",
    accentColor: isCustomPlanColor(input.accentColor)
      ? input.accentColor
      : DEFAULT_CUSTOM_PLAN_COLOR,
    timeLocked: false,
    createdAt: new Date().toISOString(),
  };
  updatePlan(date, (items) => [...items, item]);
  if (createsNewPlan) void recordSiteAnalyticsEvent("plan_created").catch(() => undefined);
  return item;
}

export function updateCustomPlanItem(date: string, id: string, input: CustomPlanItemInput) {
  if (!input.title.trim()) throw new Error("予定名を入力してください。");
  if (!isTime(input.startTime) || !isTime(input.endTime)) throw new Error("時刻が正しくありません。");
  if (timeToMinutes(input.endTime) <= timeToMinutes(input.startTime)) {
    throw new Error("終了時刻は開始時刻より後にしてください。");
  }

  const plan = updatePlan(date, (items) => items.map((item) => {
    if (item.id !== id || item.kind !== "custom") return item;
    return {
      ...item,
      title: input.title.trim(),
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location?.trim() ?? "",
      note: input.note?.trim() ?? "",
      accentColor: isCustomPlanColor(input.accentColor)
        ? input.accentColor
        : DEFAULT_CUSTOM_PLAN_COLOR,
    };
  }));
  return plan?.items.find((item) => item.id === id) ?? null;
}

export function shiftCustomPlanItem(date: string, id: string, deltaMinutes: number) {
  const plan = updatePlan(date, (items) => items.map((item) => {
    if (item.id !== id || item.kind !== "custom") return item;
    const duration = Math.max(5, timeToMinutes(item.endTime) - timeToMinutes(item.startTime));
    const nextStart = Math.max(0, Math.min((24 * 60) - duration - 1, timeToMinutes(item.startTime) + deltaMinutes));
    return {
      ...item,
      startTime: minutesToTime(nextStart),
      endTime: minutesToTime(nextStart + duration),
    };
  }));
  return plan?.items.find((item) => item.id === id) ?? null;
}

export function removePlanItem(date: string, id: string) {
  updatePlan(date, (items) => items.filter((item) => item.id !== id));
}

export function clearPlan(date: string) {
  updatePlan(date, () => []);
}

export function isScheduleInPlan(plans: Record<string, DailyPlan>, scheduleId: string, targetDate: string) {
  return plans[targetDate]?.items.some((item) => item.sourceScheduleId === scheduleId) ?? false;
}

function sameNames(left: string[], right: string[]) {
  return left.length === right.length && left.every((name, index) => name === right[index]);
}

function isFanStudioLocation(value: string) {
  return value.normalize("NFKC").includes("ファンスタジオ");
}

function legacyFanStudioMatches(date: string, item: DailyPlanItem, entries: ScheduleEntry[]) {
  if (!isFanStudioLocation(item.location)) return [];
  const normalizedLocation = item.location.normalize("NFKC").replace(/\s+/g, "").toLocaleLowerCase("ja");
  return entries.filter((entry) => entry.sourceId === "harmonyland-funstudio"
    && entry.date === date
    && entry.startTime === item.startTime
    && entry.location.normalize("NFKC").replace(/\s+/g, "").toLocaleLowerCase("ja") === normalizedLocation);
}

export type OfficialPlanSyncResult = {
  plans: Record<string, DailyPlan>;
  changed: boolean;
  updatedCount: number;
  missingCount: number;
  reviewCount: number;
};

export function reconcileOfficialPlanItems(
  plans: Record<string, DailyPlan>,
  scheduleEntries: ScheduleEntry[],
  syncedAt = new Date().toISOString(),
  availableFrom?: string,
): OfficialPlanSyncResult {
  const entriesById = new Map(scheduleEntries.map((entry) => [entry.id, entry]));
  const entriesByKey = new Map<string, ScheduleEntry[]>();
  scheduleEntries.forEach((entry) => {
    const key = getScheduleSourceKey(entry);
    if (!key) return;
    entriesByKey.set(key, [...(entriesByKey.get(key) ?? []), entry]);
  });

  let changed = false;
  let updatedCount = 0;
  let missingCount = 0;
  let reviewCount = 0;
  const nextPlans: Record<string, DailyPlan> = {};

  Object.entries(plans).forEach(([date, plan]) => {
    if (availableFrom && date < availableFrom) {
      nextPlans[date] = plan;
      return;
    }
    let planChanged = false;
    const nextItems = plan.items.map((item) => {
      if (item.kind !== "official") return item;

      const exactMatch = item.sourceScheduleId ? entriesById.get(item.sourceScheduleId) : undefined;
      const keyedMatches = !exactMatch && item.sourceScheduleKey
        ? entriesByKey.get(item.sourceScheduleKey) ?? []
        : [];
      const legacyMatches = !exactMatch && !item.sourceScheduleKey
        ? legacyFanStudioMatches(date, item, scheduleEntries)
        : [];
      const candidates = exactMatch ? [exactMatch] : keyedMatches.length > 0 ? keyedMatches : legacyMatches;

      if (candidates.length !== 1) {
        const syncStatus: OfficialPlanSyncStatus = candidates.length > 1 ? "needs-review" : "missing";
        if (syncStatus === "needs-review") reviewCount += 1;
        else missingCount += 1;
        if (item.syncStatus === syncStatus) return item;
        planChanged = true;
        return { ...item, syncStatus };
      }

      const latest = candidates[0];
      const latestNames = getEntryCharacterNames(latest);
      const latestEndTime = normalizedEndTime(latest.startTime, latest.endTime);
      const contentChanged = item.sourceScheduleId !== latest.id
        || item.title !== latest.title
        || !sameNames(item.characterNames, latestNames)
        || item.scheduleType !== latest.scheduleType
        || item.startTime !== latest.startTime
        || item.endTime !== latestEndTime
        || item.location !== latest.location;
      const sourceScheduleKey = getScheduleSourceKey(latest);
      const syncStatus: OfficialPlanSyncStatus = contentChanged ? "updated" : "current";
      const metadataChanged = item.sourceScheduleKey !== sourceScheduleKey
        || item.sourceUpdatedAt !== latest.updatedAt
        || item.syncStatus !== syncStatus;
      if (!contentChanged && !metadataChanged) return item;

      planChanged = true;
      if (contentChanged) updatedCount += 1;
      return {
        ...item,
        sourceScheduleId: latest.id,
        sourceScheduleKey,
        sourceUpdatedAt: latest.updatedAt,
        syncStatus,
        title: latest.title,
        characterNames: latestNames,
        scheduleType: latest.scheduleType,
        startTime: latest.startTime,
        endTime: latestEndTime,
        location: latest.location,
      };
    });

    if (planChanged) {
      changed = true;
      nextPlans[date] = { ...plan, items: sortPlanItems(nextItems), updatedAt: syncedAt };
    } else {
      nextPlans[date] = plan;
    }
  });

  return { plans: nextPlans, changed, updatedCount, missingCount, reviewCount };
}

export function syncOfficialPlanItems(scheduleEntries: ScheduleEntry[], availableFrom?: string) {
  const result = reconcileOfficialPlanItems(readState().plans, scheduleEntries, new Date().toISOString(), availableFrom);
  if (result.changed) writeState({ version: 2, plans: result.plans });
  return result;
}
