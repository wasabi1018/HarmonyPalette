import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { isValidBirthday } from "@/lib/character-birthday";
import { getCharacterThemeColor } from "@/lib/character-theme-colors";
import { revalidatePublicCharacterData } from "@/lib/public-cache";
import { assertImportAuthorization, getSupabaseAdminClient } from "@/lib/supabase/server";

type CharacterInput = {
  id?: unknown;
  slug?: unknown;
  name?: unknown;
  nameKana?: unknown;
  image?: unknown;
  officialUrl?: unknown;
  isFanStudioRegular?: unknown;
  themeColor?: unknown;
  displayOrder?: unknown;
  birthdayMonth?: unknown;
  birthdayDay?: unknown;
};

function normalizeSlug(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function hasOwn(input: CharacterInput, key: keyof CharacterInput) {
  return Object.prototype.hasOwnProperty.call(input, key);
}

function parseBirthdayPart(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "number" && typeof value !== "string") return Number.NaN;
  if (typeof value === "string" && value.trim() === "") return null;
  const number = Number(value);
  return Number.isInteger(number) ? number : Number.NaN;
}

function parseBirthdayInput(input: CharacterInput, isUpdate: boolean) {
  const hasMonth = hasOwn(input, "birthdayMonth");
  const hasDay = hasOwn(input, "birthdayDay");
  if (!hasMonth && !hasDay) {
    return isUpdate
      ? {}
      : { birthday_month: null, birthday_day: null };
  }

  const month = parseBirthdayPart(input.birthdayMonth);
  const day = parseBirthdayPart(input.birthdayDay);
  if (month === null && day === null) {
    return { birthday_month: null, birthday_day: null };
  }
  if (month === null || day === null) {
    throw new Error("誕生月と誕生日は両方入力してください。");
  }
  if (!isValidBirthday(month, day)) {
    throw new Error("存在する誕生日を入力してください。");
  }

  return { birthday_month: month, birthday_day: day };
}

function parseCharacterInput(input: CharacterInput, requireId: boolean) {
  const id = typeof input.id === "string" ? input.id.trim() : "";
  const name = typeof input.name === "string" ? input.name.trim().replace(/\s+/g, " ") : "";
  const requestedSlug = typeof input.slug === "string" ? input.slug : "";
  const slug = normalizeSlug(requestedSlug)
    || `character-${createHash("sha256").update(name).digest("hex").slice(0, 12)}`;
  const nameKana = typeof input.nameKana === "string" ? input.nameKana.trim() : "";
  const image = typeof input.image === "string" && input.image.trim()
    ? input.image.trim()
    : "/character-placeholder.svg";
  const officialUrl = typeof input.officialUrl === "string" ? input.officialUrl.trim() : "";
  const themeColor = typeof input.themeColor === "string"
    ? input.themeColor.trim()
    : getCharacterThemeColor(name);
  const displayOrder = input.displayOrder === undefined ? 999 : Number(input.displayOrder);

  if ((requireId && !id) || !name) throw new Error("キャラクター名を入力してください。");
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) throw new Error("slugは半角英数字とハイフンで入力してください。");
  if (!/^#[0-9a-f]{6}$/i.test(themeColor)) throw new Error("テーマカラーは#から始まる6桁のカラーコードで入力してください。");
  if (!Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 999999) {
    throw new Error("表示順は0〜999999の整数で指定してください。");
  }
  for (const [label, value] of [["画像URL", image], ["公式URL", officialUrl]] as const) {
    if (value && !value.startsWith("/") && !/^https?:\/\//i.test(value)) {
      throw new Error(`${label}はhttps://から始まるURL、または/から始まるサイト内パスで入力してください。`);
    }
  }

  return {
    id,
    slug,
    name,
    name_kana: nameKana,
    image_url: image,
    official_url: officialUrl,
    is_fan_studio_regular: Boolean(input.isFanStudioRegular),
    theme_color: themeColor,
    display_order: displayOrder,
    ...parseBirthdayInput(input, requireId),
  };
}

async function ensureUnique(
  client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  name: string,
  slug: string,
  exceptId?: string,
) {
  let nameQuery = client.from("characters").select("id").eq("name", name);
  let slugQuery = client.from("characters").select("id").eq("slug", slug);
  if (exceptId) {
    nameQuery = nameQuery.neq("id", exceptId);
    slugQuery = slugQuery.neq("id", exceptId);
  }
  const [{ data: sameName, error: nameError }, { data: sameSlug, error: slugError }] = await Promise.all([
    nameQuery.limit(1),
    slugQuery.limit(1),
  ]);
  if (nameError || slugError) throw new Error(nameError?.message || slugError?.message || "重複確認に失敗しました。");
  if ((sameName ?? []).length > 0) throw new Error("同じ名前のキャラクターがすでに登録されています。");
  if ((sameSlug ?? []).length > 0) throw new Error("同じslugのキャラクターがすでに登録されています。");
}

export async function POST(request: Request) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  const client = getSupabaseAdminClient();
  if (!client) return NextResponse.json({ error: "Supabaseのサーバー用秘密鍵が設定されていません。" }, { status: 503 });

  try {
    const character = parseCharacterInput(await request.json() as CharacterInput, false);
    await ensureUnique(client, character.name, character.slug);
    const id = character.slug;
    const { data, error } = await client.from("characters").insert({ ...character, id }).select("*").single();
    if (error) throw new Error(error.message);
    revalidatePublicCharacterData();
    return NextResponse.json({ ok: true, character: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "登録に失敗しました。" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  const client = getSupabaseAdminClient();
  if (!client) return NextResponse.json({ error: "Supabaseのサーバー用秘密鍵が設定されていません。" }, { status: 503 });

  try {
    const character = parseCharacterInput(await request.json() as CharacterInput, true);
    await ensureUnique(client, character.name, character.slug, character.id);
    const { id, ...updates } = character;
    const { data, error } = await client.from("characters").update(updates).eq("id", id).select("*").maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ error: "編集対象のキャラクターが見つかりません。" }, { status: 404 });
    revalidatePublicCharacterData();
    return NextResponse.json({ ok: true, character: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "編集に失敗しました。" }, { status: 400 });
  }
}
