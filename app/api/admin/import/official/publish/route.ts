import { NextResponse } from "next/server";
import {
  publishImportRun,
  updateImportDrafts,
  type OperationDraftEdit,
  type ParkOperatingDayDraftEdit,
  type ScheduleDraftEdit,
} from "@/lib/supabase/schedule-repository";
import { revalidatePublicScheduleData } from "@/lib/public-cache";
import { assertImportAuthorization } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function record(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label}の形式が正しくありません。`);
  return value as Record<string, unknown>;
}

function requiredText(value: unknown, label: string, maxLength = 300) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label}を入力してください。`);
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new Error(`${label}は${maxLength}文字以内で入力してください。`);
  return normalized;
}

function optionalText(value: unknown, label: string, maxLength = 2000) {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") throw new Error(`${label}の形式が正しくありません。`);
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new Error(`${label}は${maxLength}文字以内で入力してください。`);
  return normalized || undefined;
}

function dateText(value: unknown, label: string) {
  const normalized = requiredText(value, label, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) throw new Error(`${label}の日付形式が正しくありません。`);
  return normalized;
}

function timeText(value: unknown, label: string, required: boolean) {
  const normalized = required ? requiredText(value, label, 5) : optionalText(value, label, 5);
  if (normalized && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(normalized)) throw new Error(`${label}の時刻形式が正しくありません。`);
  return normalized;
}

function parseScheduleEdit(value: unknown): ScheduleDraftEdit {
  const item = record(value, "予定の修正内容");
  const names = Array.isArray(item.characterNames)
    ? [...new Set(item.characterNames.map((name) => requiredText(name, "キャラクター名", 80)))]
    : [];
  return {
    externalKey: requiredText(item.externalKey, "予定識別子", 1000),
    title: requiredText(item.title, "予定名"),
    date: dateText(item.date, "開催日"),
    startTime: timeText(item.startTime, "開始時間", true) as string,
    endTime: timeText(item.endTime, "終了時間", false),
    scheduleType: requiredText(item.scheduleType, "予定種別", 120),
    location: requiredText(item.location, "開催場所", 200),
    description: optionalText(item.description, "説明") || "",
    characterNames: names,
  };
}

function parseOperationEdit(value: unknown): OperationDraftEdit {
  const item = record(value, "運行情報の修正内容");
  const status = requiredText(item.operationStatus, "運行状態", 20);
  if (!(["scheduled", "suspended", "limited", "unknown"] as const).includes(status as OperationDraftEdit["operationStatus"])) {
    throw new Error("運行状態が正しくありません。");
  }
  return {
    externalKey: requiredText(item.externalKey, "運行情報識別子", 1000),
    attractionName: requiredText(item.attractionName, "アトラクション名"),
    date: dateText(item.date, "運行日"),
    startTime: timeText(item.startTime, "開始時間", false),
    endTime: timeText(item.endTime, "終了時間", false),
    operationStatus: status as OperationDraftEdit["operationStatus"],
    notes: optionalText(item.notes, "注記") || "",
  };
}

function parseOperatingDayEdit(value: unknown): ParkOperatingDayDraftEdit {
  const item = record(value, "営業情報の修正内容");
  const status = requiredText(item.operatingStatus, "営業状態", 20);
  if (!("open" === status || "closed" === status || "unknown" === status)) {
    throw new Error("営業状態が正しくありません。");
  }
  const openingTime = timeText(item.openingTime, "開園時間", status === "open");
  const closingTime = timeText(item.closingTime, "閉園時間", status === "open");
  if (status === "open" && openingTime && closingTime && openingTime >= closingTime) {
    throw new Error("閉園時間は開園時間より後にしてください。");
  }
  return {
    externalKey: requiredText(item.externalKey, "営業情報識別子", 1000),
    date: dateText(item.date, "営業日"),
    operatingStatus: status,
    openingTime: status === "open" ? openingTime : undefined,
    closingTime: status === "open" ? closingTime : undefined,
    sourceTitle: optionalText(item.sourceTitle, "公式タイトル", 500) || "",
    notes: optionalText(item.notes, "注記") || "",
  };
}

export async function POST(request: Request) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  try {
    const body = await request.json() as {
      runId?: string;
      scheduleKeys?: string[];
      operationKeys?: string[];
      operatingDayKeys?: string[];
      scheduleEdits?: unknown[];
      operationEdits?: unknown[];
      operatingDayEdits?: unknown[];
    };
    if (!body.runId || !/^[0-9a-f-]{36}$/i.test(body.runId)) {
      return NextResponse.json({ error: "公開する取込IDが正しくありません。" }, { status: 400 });
    }
    const scheduleEdits = Array.isArray(body.scheduleEdits) ? body.scheduleEdits.map(parseScheduleEdit) : [];
    const operationEdits = Array.isArray(body.operationEdits) ? body.operationEdits.map(parseOperationEdit) : [];
    const operatingDayEdits = Array.isArray(body.operatingDayEdits) ? body.operatingDayEdits.map(parseOperatingDayEdit) : [];
    const selectedOperatingDayKeys = Array.isArray(body.operatingDayKeys)
      ? body.operatingDayKeys.map((key) => requiredText(key, "営業情報識別子", 1000))
      : undefined;
    const selectedOperatingDayKeySet = new Set(selectedOperatingDayKeys ?? []);
    if (operatingDayEdits.some((edit) => selectedOperatingDayKeySet.has(edit.externalKey) && edit.operatingStatus === "unknown")) {
      return NextResponse.json({ error: "確認が必要な営業情報は、営業日または休園日に修正してから公開してください。" }, { status: 400 });
    }
    await updateImportDrafts(body.runId, scheduleEdits, operationEdits, operatingDayEdits);
    await publishImportRun(
      body.runId,
      Array.isArray(body.scheduleKeys) ? body.scheduleKeys : undefined,
      Array.isArray(body.operationKeys) ? body.operationKeys : undefined,
      selectedOperatingDayKeys,
    );
    revalidatePublicScheduleData();
    return NextResponse.json({ published: true, runId: body.runId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "公開処理に失敗しました。" }, { status: 500 });
  }
}
