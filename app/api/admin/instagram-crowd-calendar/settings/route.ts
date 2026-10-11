import { NextResponse } from "next/server";
import { validateCrowdSettings } from "@/lib/crowd-calendar";
import { saveCrowdCalendarSettings } from "@/lib/instagram-crowd-calendar";
import { assertImportAuthorization } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  let settings;
  try {
    settings = validateCrowdSettings(await request.json());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "共通設定を確認してください。" }, { status: 400 });
  }
  try {
    return NextResponse.json({ settings: await saveCrowdCalendarSettings(settings) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "共通設定を保存できませんでした。" }, { status: 500 });
  }
}
