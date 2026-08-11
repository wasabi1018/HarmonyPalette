import type { ParkOperatingDayCandidate } from "@/lib/official-import/types";
import { sha256 } from "@/lib/official-import/utils";

export type HarmonylandCalendarRecord = {
  category_name?: string;
  event_link?: string;
  event_time?: string;
  event_endtime?: string;
  event_title?: string;
};

const OFFICIAL_CALENDAR_URL = "https://www.harmonyland.jp/event#calendar";

function compactTime(value?: string) {
  const match = value?.trim().match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  return match ? `${match[1]}:${match[2]}` : undefined;
}

function isClosedRecord(record: HarmonylandCalendarRecord) {
  return record.category_name?.trim() === "休園日" || record.event_title?.includes("休園日") === true;
}

function sourceHash(records: HarmonylandCalendarRecord[]) {
  return sha256(new TextEncoder().encode(JSON.stringify(records)));
}

export function normalizeParkOperatingDay(
  date: string,
  records: HarmonylandCalendarRecord[],
  sourceUrl: string,
): ParkOperatingDayCandidate {
  const closedRecords = records.filter(isClosedRecord);
  const openRecords = records.flatMap((record) => {
    if (isClosedRecord(record)) return [];
    const openingTime = compactTime(record.event_time);
    const closingTime = compactTime(record.event_endtime);
    if (!openingTime || !closingTime || openingTime >= closingTime) return [];
    return [{ record, openingTime, closingTime }];
  });
  const rawPayload = { date, records };
  const base = {
    externalKey: `harmonyland:park-operating-day:${date}`,
    sourceId: "harmonyland-calendar" as const,
    sourceReference: `${sourceUrl}#${date}`,
    sourceHash: sourceHash(records),
    date,
    officialUrl: OFFICIAL_CALENDAR_URL,
    rawPayload,
  };

  if (closedRecords.length > 0 && openRecords.length === 0) {
    return {
      ...base,
      operatingStatus: "closed",
      sourceTitle: closedRecords[0].event_title?.trim() || `${date} 休園日`,
      notes: "",
      verificationStatus: "verified",
      confidence: 0.99,
    };
  }

  const timePairs = new Map(openRecords.map((entry) => [`${entry.openingTime}-${entry.closingTime}`, entry]));
  if (closedRecords.length === 0 && timePairs.size === 1) {
    const entry = timePairs.values().next().value as (typeof openRecords)[number];
    return {
      ...base,
      operatingStatus: "open",
      openingTime: entry.openingTime,
      closingTime: entry.closingTime,
      sourceTitle: entry.record.event_title?.trim() || `${date} ${entry.openingTime}-${entry.closingTime}`,
      notes: "",
      verificationStatus: "verified",
      confidence: 0.99,
    };
  }

  const conflict = closedRecords.length > 0 && openRecords.length > 0;
  const notes = conflict
    ? "営業日と休園日の情報が同じ日に含まれています。"
    : timePairs.size > 1
      ? "複数の営業時間が同じ日に含まれています。"
      : "営業時間または休園日を判定できませんでした。";
  return {
    ...base,
    operatingStatus: "unknown",
    sourceTitle: records.find((record) => record.event_title?.trim())?.event_title?.trim() || "",
    notes,
    verificationStatus: "needs-review",
    confidence: 0.2,
  };
}
