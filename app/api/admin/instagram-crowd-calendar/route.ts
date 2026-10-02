import { NextResponse } from "next/server";
import { crowdMonthDates, isCrowdMonth } from "@/lib/crowd-calendar";
import {
  getCrowdCalendarDraft,
  saveCrowdCalendarDraft,
} from "@/lib/instagram-crowd-calendar";
import { assertImportAuthorization } from "@/lib/supabase/server";
import { getPublishedParkOperatingDays } from "@/lib/supabase/schedule-repository";

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
    const [draft, operatingDays] = await Promise.all([
      getCrowdCalendarDraft(month),
      getPublishedParkOperatingDays(`${month}-01`, lastDay),
    ]);
    if (!operatingDays) throw new Error("営業情報を取得できませんでした。");
    const closedDates = operatingDays
      .filter((day) => day.operating_status === "closed")
      .map((day) => day.operation_date);
    return NextResponse.json({ draft, closedDates });
  } catch (error) {
    return failure(error, "混雑予想カレンダーを読み込めませんでした。");
  }
}

export async function PUT(request: Request) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  }

  let input: { month?: unknown; overrides?: unknown };
  try {
    input = await request.json() as { month?: unknown; overrides?: unknown };
  } catch {
    return NextResponse.json({ error: "送信内容を確認してください。" }, { status: 400 });
  }
  if (!input || !isCrowdMonth(input.month) || !input.overrides || typeof input.overrides !== "object" || Array.isArray(input.overrides)) {
    return NextResponse.json({ error: "対象月と日付の設定を確認してください。" }, { status: 400 });
  }
  try {
    return NextResponse.json({ draft: await saveCrowdCalendarDraft(input.month, input.overrides) });
  } catch (error) {
    return failure(error, "混雑予想カレンダーを保存できませんでした。");
  }
}
