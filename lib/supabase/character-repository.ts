import "server-only";

import { unstable_cache } from "next/cache";
import type { Character } from "@/data/types";
import { isValidBirthday } from "@/lib/character-birthday";
import {
  PUBLIC_CACHE_REVALIDATE_SECONDS,
  PUBLIC_CACHE_TAGS,
} from "@/lib/public-cache";
import { getSupabaseReadClient } from "@/lib/supabase/server";

function compareCharacters(a: Character, b: Character) {
  const orderDifference = (a.displayOrder ?? 999) - (b.displayOrder ?? 999);
  if (orderDifference !== 0) return orderDifference;
  return (a.nameKana || a.name).localeCompare(b.nameKana || b.name, "ja")
    || a.name.localeCompare(b.name, "ja")
    || a.id.localeCompare(b.id);
}

function mapCharacter(row: Record<string, unknown>): Character {
  const birthdayMonth = Number(row.birthday_month);
  const birthdayDay = Number(row.birthday_day);
  const hasValidBirthday = isValidBirthday(birthdayMonth, birthdayDay);

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
    birthdayMonth: hasValidBirthday ? birthdayMonth : null,
    birthdayDay: hasValidBirthday ? birthdayDay : null,
  };
}

async function readRegisteredCharacters() {
  const client = getSupabaseReadClient();
  if (!client) return null;

  const { data, error } = await client.from("characters").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapCharacter(row)).sort(compareCharacters);
}

const getCachedRegisteredCharacters = unstable_cache(
  readRegisteredCharacters,
  [PUBLIC_CACHE_TAGS.characters],
  {
    revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.characters],
  },
);

export async function getRegisteredCharacters() {
  return getCachedRegisteredCharacters();
}
