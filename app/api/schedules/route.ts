import { NextResponse } from "next/server";
import { addDays } from "@/lib/official-import/utils";
import { getPublishedSchedules } from "@/lib/supabase/schedule-repository";
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
  if (!config.canRead) return NextResponse.json({ configured: false, entries: [] });

  try {
    const rows = await getPublishedSchedules(from, to);
    const entries = (rows ?? []).map((row) => {
      const cast = Array.isArray(row.schedule_characters) ? row.schedule_characters : [];
      return {
        id: `supabase:${row.id}`,
        externalKey: row.external_key,
        kind: row.kind,
        title: row.title,
        date: row.event_date,
        endDate: row.end_date || undefined,
        startTime: String(row.start_time).slice(0, 5),
        endTime: row.end_time ? String(row.end_time).slice(0, 5) : undefined,
        characterIds: cast.map((character: { character_id?: string | null }) => character.character_id).filter(Boolean),
        characterNames: cast.map((character: { character_name: string }) => character.character_name),
        scheduleType: row.schedule_type,
        location: row.location,
        description: row.description,
        officialUrl: row.official_url,
        sourceName: row.source_id === "harmonyland-funstudio" ? "ハーモニーランド公式 ファンスタジオ" : "ハーモニーランド公式 日別PDF",
        updatedAt: row.updated_at,
        status: row.event_date < today ? "completed" : "upcoming",
        isSample: false,
        isImported: true,
        sourceId: row.source_id,
        sourceReference: row.source_reference,
        verificationStatus: row.verification_status,
      };
    });
    return NextResponse.json({ configured: true, entries }, { headers: cacheHeaders });
  } catch (error) {
    return NextResponse.json({ configured: true, entries: [], error: error instanceof Error ? error.message : "読込に失敗しました。" }, { status: 500 });
  }
}
