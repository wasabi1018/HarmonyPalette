import { NextResponse } from "next/server";
import { getCharacterThemeColor } from "@/lib/character-theme-colors";
import { assertImportAuthorization, getSupabaseAdminClient } from "@/lib/supabase/server";

type OrderUpdate = {
  id?: unknown;
  name?: unknown;
  displayOrder?: unknown;
};

export async function PATCH(request: Request) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  }

  const client = getSupabaseAdminClient();
  if (!client) {
    return NextResponse.json({ error: "Supabaseのサーバー用秘密鍵が設定されていません。" }, { status: 503 });
  }

  try {
    const body = await request.json() as { orders?: OrderUpdate[] };
    const orders = (body.orders ?? []).map((item) => ({
      id: typeof item.id === "string" ? item.id.trim() : "",
      name: typeof item.name === "string" ? item.name.trim() : "",
      displayOrder: Number(item.displayOrder),
    }));
    if (orders.length === 0 || orders.some((item) => !item.id || !item.name || !Number.isInteger(item.displayOrder) || item.displayOrder < 0 || item.displayOrder > 999999)) {
      return NextResponse.json({ error: "表示順は0〜999999の整数で指定してください。" }, { status: 400 });
    }

    const { data: knownCharacters, error: listError } = await client
      .from("characters")
      .select("id, name");
    if (listError) throw new Error(`キャラクター台帳を確認できませんでした: ${listError.message}`);
    const knownIds = new Set((knownCharacters ?? []).map((character) => String(character.id)));
    const idByName = new Map((knownCharacters ?? []).map((character) => [String(character.name), String(character.id)]));

    for (const item of orders) {
      const existingId = knownIds.has(item.id) ? item.id : idByName.get(item.name);
      const operation = existingId
        ? client.from("characters").update({ display_order: item.displayOrder }).eq("id", existingId)
        : client.from("characters").insert({
          id: item.id,
          slug: item.id,
          name: item.name,
          name_kana: "",
          image_url: "/character-placeholder.svg",
          official_url: "https://www.harmonyland.jp/",
          is_fan_studio_regular: false,
          theme_color: getCharacterThemeColor(item.name),
          display_order: item.displayOrder,
        });
      const { error } = await operation;
      if (error) {
        const migrationHint = error.message.includes("display_order")
          ? " Supabase SQL Editorで202607220002_character_display_order.sqlを実行してください。"
          : "";
        throw new Error(`${error.message}${migrationHint}`);
      }
      if (!existingId) {
        knownIds.add(item.id);
        idByName.set(item.name, item.id);
      }
    }

    return NextResponse.json({ ok: true, updated: orders.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "表示順の保存に失敗しました。" },
      { status: 500 },
    );
  }
}
