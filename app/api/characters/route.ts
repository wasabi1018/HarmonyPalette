import { NextResponse } from "next/server";
import { getRegisteredCharacters } from "@/lib/supabase/character-repository";
import { getSupabaseConfigStatus } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getSupabaseConfigStatus();
  if (!config.canRead) {
    return NextResponse.json({ configured: false, characters: [] });
  }

  try {
    const characters = await getRegisteredCharacters();
    return NextResponse.json({ configured: true, characters });
  } catch (error) {
    return NextResponse.json(
      { configured: true, characters: [], error: error instanceof Error ? error.message : "キャラクター一覧の読込に失敗しました。" },
      { status: 500 },
    );
  }
}
