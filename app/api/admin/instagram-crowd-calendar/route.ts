import { NextResponse } from "next/server";
import { buildCrowdCalendarFacts, crowdMonthDates, isCrowdMonth, validateCrowdAnnotations } from "@/lib/crowd-calendar";
import { getCharacterBirthdaysInRange } from "@/lib/character-birthday";
import {
  getCrowdCalendarDraft,
  getCrowdCalendarSettings,
  saveCrowdCalendarDraft,
} from "@/lib/instagram-crowd-calendar";
import { assertImportAuthorization } from "@/lib/supabase/server";
import { getPublishedParkOperatingDays, getPublishedSchedules } from "@/lib/supabase/schedule-repository";
import { getRegisteredCharacters } from "@/lib/supabase/character-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function failure(error: unknown, fallback: string) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallback },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  }

  const month = new URL(request.url).searchParams.get("month");
  if (!isCrowdMonth(month)) {
    return NextResponse.json({ error: "対象月を確認してください。" }, { status: 400 });
  }
  try {
    const monthInfo = crowdMonthDates(month);
    if (!monthInfo) throw new Error("対象月を確認してください。");
    const lastDay = `${month}-${String(monthInfo.dayCount).padStart(2, "0")}`;
    const [draft, settings, operatingDays, schedules, characters] = await Promise.all([
      getCrowdCalendarDraft(month),
      getCrowdCalendarSettings(),
      getPublishedParkOperatingDays(`${month}-01`, lastDay),
      getPublishedSchedules(`${month}-01`, lastDay),
      getRegisteredCharacters(),
    ]);
    if (!operatingDays) throw new Error("営業情報を取得できませんでした。");
    if (!schedules || !characters) throw new Error("予定・誕生日を取得できませんでした。");
    const closedDates = operatingDays
      .filter((day) => day.operating_status === "closed")
      .map((day) => day.operation_date);
    const facts = buildCrowdCalendarFacts(month,
      operatingDays.map((day) => ({ date: day.operation_date, status: day.operating_status, closingTime: day.closing_time })),
      schedules.map((entry) => ({ date: entry.event_date, kind: entry.kind, sourceId: entry.source_id, scheduleType: entry.schedule_type, location: entry.location, verified: entry.verification_status === "verified" })),
      getCharacterBirthdaysInRange(characters, `${month}-01`, lastDay).map(({ date, character }) => ({ date, name: character.name })),
    );
    return NextResponse.json({ draft, settings, closedDates, facts });
  } catch (error) {
    return failure(error, "混雑予想カレンダーを読み込めませんでした。");
  }
}

export async function PUT(request: Request) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  }

  let input: { month?: unknown; overrides?: unknown; annotations?: unknown };
  try {
    input = await request.json() as typeof input;
  } catch {
    return NextResponse.json({ error: "送信内容を確認してください。" }, { status: 400 });
  }
  if (!input || !isCrowdMonth(input.month) || !input.overrides || typeof input.overrides !== "object" || Array.isArray(input.overrides)) {
    return NextResponse.json({ error: "対象月と日付の設定を確認してください。" }, { status: 400 });
  }
  let annotations;
  try {
    annotations = validateCrowdAnnotations(input.month, input.annotations ?? {});
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "日付の設定を確認してください。" }, { status: 400 });
  }
  try {
    return NextResponse.json({ draft: await saveCrowdCalendarDraft(input.month, input.overrides, annotations) });
  } catch (error) {
    return failure(error, "混雑予想カレンダーを保存できませんでした。");
  }
}
