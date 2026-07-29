"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import officialScheduleData from "@/public/data/harmonyland-official-schedule-2026-07-03-08-15.json";
import { parseScheduleImportDocument, type ImportedScheduleEntry, type ImportVerificationStatus } from "@/lib/schedule-import";

export type ScheduleEntryKind = "greeting" | "event";

export type ScheduleEntry = {
  id: string;
  kind: ScheduleEntryKind;
  title: string;
  date: string;
  endDate?: string;
  startTime: string;
  endTime?: string;
  characterIds: string[];
  characterNames?: string[];
  scheduleType: string;
  location: string;
  description: string;
  officialUrl: string;
  sourceName: string;
  updatedAt: string;
  status: "upcoming" | "soon" | "completed";
  isSample: boolean;
  isImported?: boolean;
  sourceId?: string;
  sourceReference?: string;
  verificationStatus?: ImportVerificationStatus;
  appearanceNotes?: string[];
};

type StoredScheduleState = {
  customEntries: ScheduleEntry[];
  deletedIds: string[];
};

export type DataLoadStatus = "loading" | "success" | "error" | "unavailable";

type UseScheduleEntriesOptions = {
  fallbackToBundled?: boolean;
};

type PublishedScheduleResult = {
  configured: boolean;
  entries: ScheduleEntry[];
};

let publishedScheduleCache: PublishedScheduleResult | null = null;
let publishedScheduleRequest: Promise<PublishedScheduleResult> | null = null;

function loadPublishedSchedules(force = false) {
  if (publishedScheduleRequest) return publishedScheduleRequest;
  if (!force && publishedScheduleCache) return Promise.resolve(publishedScheduleCache);
  if (force) publishedScheduleCache = null;

  publishedScheduleRequest = fetch("/api/schedules", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) throw new Error("公開スケジュールを取得できませんでした。");
      return response.json() as Promise<PublishedScheduleResult>;
    })
    .then((result) => {
      publishedScheduleCache = result;
      return result;
    })
    .finally(() => {
      publishedScheduleRequest = null;
    });

  return publishedScheduleRequest;
}

export const greetingTypeOptions = [
  "お出迎えグリーティング",
  "はちゃめちゃグリーティング",
  "ハイタッチグリーティング",
];

export const eventTypeOptions = [
  "ショー・パレード",
  "ステージイベント",
  "季節イベント",
  "その他イベント",
];

const STORAGE_KEY = "harmony-palette:schedule-admin:v1";
const CHANGE_EVENT = "harmony-palette:schedule-change";
const REFRESH_EVENT = "harmony-palette:schedule-refresh";
const EMPTY_STATE: StoredScheduleState = { customEntries: [], deletedIds: [] };
const EMPTY_STATE_JSON = JSON.stringify(EMPTY_STATE);
export const bundledOfficialImport = parseScheduleImportDocument(officialScheduleData);

export const baseScheduleEntries: ScheduleEntry[] = bundledOfficialImport.entries
  .map((entry) => ({ ...entry, isSample: true as const }))
  .sort(compareScheduleEntries);

function compareScheduleEntries(a: ScheduleEntry, b: ScheduleEntry) {
  return `${a.date}-${a.startTime}-${a.title}`.localeCompare(`${b.date}-${b.startTime}-${b.title}`, "ja");
}

function parseState(raw: string | null): StoredScheduleState {
  if (!raw) return EMPTY_STATE;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredScheduleState>;
    return {
      customEntries: Array.isArray(parsed.customEntries) ? parsed.customEntries : [],
      deletedIds: Array.isArray(parsed.deletedIds) ? parsed.deletedIds : [],
    };
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
  const handleChange = () => callback();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(CHANGE_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CHANGE_EVENT, handleChange);
  };
}

function writeState(state: StoredScheduleState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useScheduleEntries({ fallbackToBundled = false }: UseScheduleEntriesOptions = {}) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [remoteEntries, setRemoteEntries] = useState<ScheduleEntry[] | null>(null);
  const remoteEntriesRef = useRef<ScheduleEntry[] | null>(null);
  const [status, setStatus] = useState<DataLoadStatus>("loading");
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const handleRefresh = () => setRevision((current) => current + 1);
    window.addEventListener(REFRESH_EVENT, handleRefresh);
    return () => window.removeEventListener(REFRESH_EVENT, handleRefresh);
  }, []);

  useEffect(() => {
    let active = true;
    const hasPreviousData = remoteEntriesRef.current !== null;
    if (hasPreviousData) {
      setIsRefreshing(true);
    } else {
      setStatus("loading");
    }
    setError("");

    loadPublishedSchedules(revision > 0)
      .then((result) => {
        if (!active) return;
        if (!result.configured) {
          setStatus("unavailable");
          return;
        }
        remoteEntriesRef.current = result.entries;
        setRemoteEntries(result.entries);
        setStatus("success");
      })
      .catch((caughtError: unknown) => {
        if (!active) return;
        setError(caughtError instanceof Error ? caughtError.message : "公開スケジュールを取得できませんでした。");
        setStatus("error");
      })
      .finally(() => {
        if (active) setIsRefreshing(false);
      });
    return () => { active = false; };
  }, [revision]);

  const entries = useMemo(() => {
    const state = parseState(raw);
    const deleted = new Set(state.deletedIds);
    const sourceEntries = remoteEntries ?? (fallbackToBundled ? baseScheduleEntries : []);
    const customIds = new Set(state.customEntries.map((entry) => entry.id));
    return [
      ...sourceEntries.filter((entry) => !deleted.has(entry.id) && !customIds.has(entry.id)),
      ...state.customEntries.filter((entry) => !deleted.has(entry.id)),
    ]
      .sort(compareScheduleEntries);
  }, [fallbackToBundled, raw, remoteEntries]);

  const retry = useCallback(() => setRevision((current) => current + 1), []);

  return { entries, status, error, isRefreshing, retry };
}

export function refreshScheduleEntries() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(REFRESH_EVENT));
}

export function addScheduleEntry(entry: Omit<ScheduleEntry, "id" | "updatedAt" | "status" | "isSample">) {
  const state = parseState(window.localStorage.getItem(STORAGE_KEY));
  const id = `custom:${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
  const created: ScheduleEntry = {
    ...entry,
    id,
    updatedAt: new Date().toISOString(),
    status: "upcoming",
    isSample: false,
  };
  writeState({ ...state, customEntries: [...state.customEntries, created] });
  return created;
}

export function updateScheduleEntry(id: string, updates: Omit<ScheduleEntry, "id" | "updatedAt" | "status" | "isSample">) {
  const state = parseState(window.localStorage.getItem(STORAGE_KEY));
  const current = state.customEntries.find((entry) => entry.id === id)
    ?? baseScheduleEntries.find((entry) => entry.id === id);
  if (!current) return null;

  const updated: ScheduleEntry = {
    ...current,
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
    isSample: false,
  };
  writeState({
    customEntries: [...state.customEntries.filter((entry) => entry.id !== id), updated],
    deletedIds: state.deletedIds.filter((deletedId) => deletedId !== id),
  });
  return updated;
}

export function importScheduleEntries(entries: ImportedScheduleEntry[]) {
  const state = parseState(window.localStorage.getItem(STORAGE_KEY));
  const baseIds = new Set(baseScheduleEntries.map((entry) => entry.id));
  const customById = new Map(state.customEntries.map((entry) => [entry.id, entry]));
  let added = 0;
  let updated = 0;
  let skipped = 0;

  entries.forEach((entry) => {
    if (baseIds.has(entry.id)) {
      skipped += 1;
      return;
    }
    if (customById.has(entry.id)) updated += 1;
    else added += 1;
    customById.set(entry.id, entry);
  });

  writeState({ ...state, customEntries: Array.from(customById.values()) });
  return { added, updated, skipped };
}

export function deleteScheduleEntry(id: string) {
  const state = parseState(window.localStorage.getItem(STORAGE_KEY));
  if (state.customEntries.some((entry) => entry.id === id)) {
    const isBaseEntry = baseScheduleEntries.some((entry) => entry.id === id);
    writeState({
      customEntries: state.customEntries.filter((entry) => entry.id !== id),
      deletedIds: isBaseEntry ? Array.from(new Set([...state.deletedIds, id])) : state.deletedIds,
    });
    return;
  }

  writeState({ ...state, deletedIds: Array.from(new Set([...state.deletedIds, id])) });
}

export function restoreBaseSchedule() {
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getEntryCharacterNames(entry: Pick<ScheduleEntry, "characterIds" | "characterNames">) {
  return Array.from(new Set(entry.characterNames ?? []));
}
