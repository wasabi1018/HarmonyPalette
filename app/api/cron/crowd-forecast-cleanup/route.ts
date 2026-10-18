import { NextResponse } from "next/server";
import { cleanupForecast } from "@/lib/crowd-forecast/repository";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.ADMIN_IMPORT_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json(
      { error: "認証に失敗しました。" },
      { status: 401 },
    );
  try {
    return NextResponse.json({ ok: true, ...(await cleanupForecast()) });
  } catch {
    return NextResponse.json(
      { error: "過去月の整理に失敗しました。" },
      { status: 500 },
    );
  }
}
