import { NextResponse } from "next/server";
import { readPublicForecast } from "@/lib/crowd-forecast/repository";
import { validDate } from "@/lib/crowd-forecast/model";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date");
  if (date && !validDate(date))
    return NextResponse.json(
      { error: "日付が正しくありません。" },
      { status: 400 },
    );
  const saved = await readPublicForecast();
  return NextResponse.json(
    date
      ? {
          day: saved.days.find((d) => d.date === date) ?? null,
          delayed: saved.delayed,
        }
      : saved,
    { headers: { "Cache-Control": "no-store" } },
  );
}
