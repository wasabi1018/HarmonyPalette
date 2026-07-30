import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { CHARACTER_THEME_COLORS } from "../lib/character-theme-colors";

loadEnvConfig(process.cwd());

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secretKey) {
    throw new Error("SupabaseのURLまたはサーバー用秘密鍵が設定されていません。");
  }

  const client = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { "x-application-name": "harmony-palette-theme-colors" } },
  });

  for (const [name, themeColor] of Object.entries(CHARACTER_THEME_COLORS)) {
    const { data, error } = await client
      .from("characters")
      .update({ theme_color: themeColor })
      .eq("name", name)
      .select("id");
    if (error) throw new Error(`${name}: ${error.message}`);
    if (data.length !== 1) {
      throw new Error(`${name}: 更新対象が${data.length}件でした。`);
    }
  }

  const { data, error } = await client
    .from("characters")
    .select("name, theme_color");
  if (error) throw new Error(error.message);

  const registered = new Map(
    (data ?? []).map((character) => [String(character.name), String(character.theme_color)]),
  );
  const mismatches = Object.entries(CHARACTER_THEME_COLORS).filter(
    ([name, themeColor]) => registered.get(name) !== themeColor,
  );
  if (mismatches.length > 0) {
    throw new Error(`テーマカラーを確認できませんでした: ${mismatches.map(([name]) => name).join("、")}`);
  }

  console.log(JSON.stringify({ updated: Object.keys(CHARACTER_THEME_COLORS).length }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
