import "server-only";

import type { InitialCharacterData } from "@/lib/character-store";
import { addDays } from "@/lib/official-import/utils";
import type { InitialScheduleData, ScheduleEntry } from "@/lib/schedule-store";
import { getRegisteredCharacters } from "@/lib/supabase/character-repository";
import { getPublishedSchedules } from "@/lib/supabase/schedule-repository";
import { getSupabaseConfigStatus } from "@/lib/supabase/server";

function todayInJapan() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

export async function getInitialScheduleData(): Promise<InitialScheduleData> {
  if (!getSupabaseConfigStatus().canRead) {
    return { entries: [], status: "unavailable", error: "" };
  }

  try {
    const today = todayInJapan();
    const rows = await getPublishedSchedules(addDays(today, -31), "9999-12-31");
    const entries: ScheduleEntry[] = (rows ?? []).map((row) => {
      const characters = Array.isArray(row.schedule_characters) ? row.schedule_characters : [];
      return {
        id: `supabase:${row.id}`,
        kind: row.kind,
        title: row.title,
        date: row.event_date,
        endDate: row.end_date || undefined,
        startTime: String(row.start_time).slice(0, 5),
        endTime: row.end_time ? String(row.end_time).slice(0, 5) : undefined,
        characterIds: characters
          .map((character) => character.character_id)
          .filter((id): id is string => Boolean(id)),
        characterNames: characters.map((character) => character.character_name),
        scheduleType: row.schedule_type,
        location: row.location,
        description: row.description,
        officialUrl: row.official_url,
        sourceName: row.source_id === "harmonyland-funstudio"
          ? "ハーモニーランド公式 ファンスタジオ"
          : "ハーモニーランド公式 日別PDF",
        updatedAt: row.updated_at,
        status: row.event_date < today ? "completed" : "upcoming",
        isSample: false,
        isImported: true,
        sourceId: row.source_id,
        sourceReference: row.source_reference,
        verificationStatus: row.verification_status as ScheduleEntry["verificationStatus"],
      };
    });
    return { entries, status: "success", error: "" };
  } catch (error) {
    return {
      entries: [],
      status: "error",
      error: error instanceof Error ? error.message : "公開スケジュールを取得できませんでした。",
    };
  }
}

export async function getInitialCharacterData(): Promise<InitialCharacterData> {
  if (!getSupabaseConfigStatus().canRead) {
    return { characters: [], status: "unavailable", error: "" };
  }

  try {
    return {
      characters: (await getRegisteredCharacters()) ?? [],
      status: "success",
      error: "",
    };
  } catch (error) {
    return {
      characters: [],
      status: "error",
      error: error instanceof Error ? error.message : "キャラクター一覧を取得できませんでした。",
    };
  }
}
