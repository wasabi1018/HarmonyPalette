import { NextResponse } from "next/server";
import { getPublishedOperations } from "@/lib/supabase/schedule-repository";
import { getSupabaseConfigStatus } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
  const date = url.searchParams.get("date") || today;
  const config = getSupabaseConfigStatus();
  if (!config.canRead) return NextResponse.json({ configured: false, date, operations: [] });
  try {
    const rows = await getPublishedOperations(date);
    const operations = (rows ?? []).map((row) => ({
      id: row.id,
      date: row.operation_date,
      attractionName: row.attraction_name,
      startTime: row.start_time ? String(row.start_time).slice(0, 5) : undefined,
      endTime: row.end_time ? String(row.end_time).slice(0, 5) : undefined,
      operationStatus: row.operation_status,
      notes: row.notes,
      officialUrl: row.official_url,
      updatedAt: row.updated_at,
    }));
    return NextResponse.json({ configured: true, date, operations });
  } catch (error) {
    return NextResponse.json({ configured: true, date, operations: [], error: error instanceof Error ? error.message : "読込に失敗しました。" }, { status: 500 });
  }
}

