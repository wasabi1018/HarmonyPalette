import { NextResponse } from "next/server";
import {
  updatePublishedSchedule,
  withdrawPublishedSchedule,
  type PublishedScheduleEdit,
} from "@/lib/supabase/schedule-repository";
import { revalidatePublicScheduleData } from "@/lib/public-cache";
import { assertImportAuthorization } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requiredText(value: unknown, label: string, maxLength = 300) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label}を入力してください。`);
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new Error(`${label}は${maxLength}文字以内で入力してください。`);
  return normalized;
}

function optionalText(value: unknown, label: string, maxLength = 2000) {
  if (value == null || value === "") return "";
  if (typeof value !== "string") throw new Error(`${label}の形式が正しくありません。`);
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new Error(`${label}は${maxLength}文字以内で入力してください。`);
  return normalized;
}

function dateText(value: unknown, label: string, required = true) {
  const normalized = required ? requiredText(value, label, 10) : optionalText(value, label, 10);
  if (normalized && !/^\d{4}-\d{2}-\d{2}$/.test(normalized)) throw new Error(`${label}の日付形式が正しくありません。`);
  return normalized;
}

function timeText(value: unknown, label: string, required = true) {
  const normalized = required ? requiredText(value, label, 5) : optionalText(value, label, 5);
  if (normalized && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(normalized)) throw new Error(`${label}の時刻形式が正しくありません。`);
  return normalized;
}

function parseEdit(value: unknown): PublishedScheduleEdit {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("予定の修正内容が正しくありません。");
  const item = value as Record<string, unknown>;
  const kind = requiredText(item.kind, "予定の種類", 20);
  if (kind !== "greeting" && kind !== "event") throw new Error("予定の種類が正しくありません。");
  const date = dateText(item.date, "開催日");
  const endDate = dateText(item.endDate, "終了日", false);
  if (endDate && endDate < date) throw new Error("終了日は開催日以降を指定してください。");
  const officialUrl = optionalText(item.officialUrl, "公式情報URL", 2000);
  if (officialUrl && !/^https?:\/\//i.test(officialUrl)) throw new Error("公式情報URLはhttp://またはhttps://から入力してください。");
  const characters = Array.isArray(item.characters)
    ? Array.from(new Map(item.characters.map((value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("対象キャラクターの形式が正しくありません。");
      const character = value as Record<string, unknown>;
      const name = requiredText(character.name, "キャラクター名", 80);
      const id = optionalText(character.id, "キャラクターID", 120) || undefined;
      return [name, { id, name }] as const;
    })).values())
    : [];

  return {
    kind,
    title: requiredText(item.title, "予定名"),
    date,
    endDate: endDate || undefined,
    startTime: timeText(item.startTime, "開始時間"),
    endTime: timeText(item.endTime, "終了時間", false) || undefined,
    scheduleType: requiredText(item.scheduleType, "予定種別", 120),
    location: requiredText(item.location, "開催場所", 200),
    description: optionalText(item.description, "説明"),
    officialUrl,
    characters,
  };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) return NextResponse.json({ error: authorization.message }, { status: authorization.status });

  try {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "予定IDが正しくありません。" }, { status: 400 });
    const edit = parseEdit(await request.json());
    await updatePublishedSchedule(id, edit);
    revalidatePublicScheduleData();
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "予定の更新に失敗しました。";
    const status = message === "編集対象の予定が見つかりません。" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) return NextResponse.json({ error: authorization.message }, { status: authorization.status });

  try {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "予定IDが正しくありません。" }, { status: 400 });
    await withdrawPublishedSchedule(id);
    revalidatePublicScheduleData();
    return NextResponse.json({ withdrawn: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "予定の削除に失敗しました。";
    const status = message === "削除対象の公開予定が見つかりません。" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
