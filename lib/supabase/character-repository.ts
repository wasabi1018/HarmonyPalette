import "server-only";

import type { Character } from "@/data/types";
import { getSupabaseReadClient } from "@/lib/supabase/server";

function compareCharacters(a: Character, b: Character) {
  const orderDifference = (a.displayOrder ?? 999) - (b.displayOrder ?? 999);
  if (orderDifference !== 0) return orderDifference;
  return (a.nameKana || a.name).localeCompare(b.nameKana || b.name, "ja")
    || a.name.localeCompare(b.name, "ja")
    || a.id.localeCompare(b.id);
}

function mapCharacter(row: Record<string, unknown>): Character {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    nameKana: String(row.name_kana || ""),
    image: String(row.image_url || "/character-placeholder.svg"),
    description: "公式スケジュールから取り込んだキャラクターです。",
    officialUrl: String(row.official_url || "https://www.harmonyland.jp/"),
    isFanStudioRegular: Boolean(row.is_fan_studio_regular),
    themeColor: String(row.theme_color || "#ef8099"),
    displayOrder: Number.isFinite(Number(row.display_order)) ? Number(row.display_order) : 999,
  };
}

export async function getRegisteredCharacters() {
  const client = getSupabaseReadClient();
  if (!client) return null;

  const { data, error } = await client.from("characters").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapCharacter(row)).sort(compareCharacters);
}
