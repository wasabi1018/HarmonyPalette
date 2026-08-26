import { NextResponse } from "next/server";
import { addDays } from "@/lib/official-import/utils";
import { getPublishedParkOperatingDays } from "@/lib/supabase/schedule-repository";
import { getSupabaseConfigStatus } from "@/lib/supabase/server";

const cacheHeaders = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
  const from = url.searchParams.get("from") || addDays(today, -31);
  const to = url.searchParams.get("to") || "9999-12-31";
  const config = getSupabaseConfigStatus();
  if (!config.canRead) return NextResponse.json({ configured: false, operatingDays: [] });

  try {
    const rows = await getPublishedParkOperatingDays(from, to);
    const operatingDays = (rows ?? []).map((row) => ({
      id: `supabase:${row.id}`,
      date: row.operation_date,
      operatingStatus: row.operating_status,
      openingTime: row.opening_time ? String(row.opening_time).slice(0, 5) : undefined,
      closingTime: row.closing_time ? String(row.closing_time).slice(0, 5) : undefined,
      sourceTitle: row.source_title,
      notes: row.notes,
      officialUrl: row.official_url,
      updatedAt: row.updated_at,
    }));
    return NextResponse.json({ configured: true, operatingDays }, { headers: cacheHeaders });
  } catch (error) {
    return NextResponse.json({
      configured: true,
      operatingDays: [],
      error: error instanceof Error ? error.message : "営業情報の読込に失敗しました。",
    }, { status: 500 });
  }
}
