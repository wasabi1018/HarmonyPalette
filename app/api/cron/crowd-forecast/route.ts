import { NextResponse } from "next/server";
import { updateForecast } from "@/lib/crowd-forecast/repository";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 240;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.ADMIN_IMPORT_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json(
      { error: "認証に失敗しました。" },
      { status: 401 },
    );
  try {
    return NextResponse.json({ ok: true, ...(await updateForecast()) });
  } catch {
    return NextResponse.json(
      { error: "混雑予想の更新に失敗しました。" },
      { status: 500 },
    );
  }
}
