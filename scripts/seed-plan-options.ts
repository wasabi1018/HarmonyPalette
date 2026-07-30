import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

const facilities = [
  ["ハーモニービレッジ", 10],
  ["ハーモニーパーク", 20],
  ["ホワイトバーズスクエア", 30],
  ["フェスティバルステージ", 40],
  ["プラザステージ", 50],
  ["イベントホール", 60],
  ["ハーモニーガーデン", 70],
  ["カーニバルスクエア", 80],
  ["ネイチャーエリア", 90],
  ["フレンドリーホール", 100],
  ["ハーベストテーブル", 200],
  ["POMPOMPURIN DINER", 210],
  ["MY MELODY & KUROMI Cafe Terrace", 220],
  ["キャラフルマルシェ", 230],
  ["カントリーマーケット", 300],
  ["サンリオキャラクターコレクション", 310],
  ["サンリオnakayokuショップ", 320],
  ["リトルギフト", 330],
  ["メルヘン工房", 340],
  ["ゲストインフォメーション", 400],
  ["ベビーセンター", 410],
] as const;

const attractions = [
  ["キティキャッスル", 10, null],
  ["リズミックコースター", 20, null],
  ["ハーモニートレイン", 30, null],
  ["キャラクターグリーティングファンスタジオ", 40, "ハーモニーパーク"],
  ["Sky Pal Collection ~UNI-ONE × AR~", 50, null],
  ["サンリオEVゴーカート", 60, null],
  ["大観覧車ワンダーパノラマ", 70, null],
  ["ハローキティのエンジェルコースター", 80, null],
  ["スカイジェット", 90, "ホワイトバーズスクエア"],
  ["ウォーターショット", 100, null],
  ["ストロベリーカフェ", 110, null],
  ["フェアリーキティカルーセル", 120, null],
  ["ポップンスマイル", 130, null],
  ["サンリオキャラクターボートライド", 140, "カーニバルスクエア"],
] as const;

type ExistingOption = {
  id: string;
  name: string;
};

function normalizedName(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("ja");
}

async function syncRows(
  client: SupabaseClient,
  table: "plan_facilities" | "plan_attractions",
  rows: Array<Record<string, unknown> & { name: string }>,
) {
  const { data, error } = await client.from(table).select("id, name");
  if (error) throw new Error(error.message);
  const existing = new Map(
    ((data ?? []) as ExistingOption[]).map((item) => [normalizedName(item.name), item]),
  );
  const toInsert = rows.filter((row) => !existing.has(normalizedName(row.name)));
  const toUpdate = rows
    .map((row) => {
      const current = existing.get(normalizedName(row.name));
      return current ? { ...row, id: current.id } : null;
    })
    .filter((row): row is Record<string, unknown> & { id: string; name: string } => row !== null);

  if (toInsert.length > 0) {
    const { error: insertError } = await client.from(table).insert(toInsert);
    if (insertError) throw new Error(insertError.message);
  }
  if (toUpdate.length > 0) {
    const { error: updateError } = await client.from(table).upsert(toUpdate, { onConflict: "id" });
    if (updateError) throw new Error(updateError.message);
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secretKey) throw new Error("SupabaseのURLまたはサーバー用秘密鍵が設定されていません。");
  const client = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  await syncRows(
    client,
    "plan_facilities",
    facilities.map(([name, displayOrder]) => ({
      name,
      display_order: displayOrder,
      is_active: true,
    })),
  );

  const { data: facilityRows, error: facilityError } = await client
    .from("plan_facilities")
    .select("id, name");
  if (facilityError) throw new Error(facilityError.message);
  const facilityIds = new Map(
    ((facilityRows ?? []) as ExistingOption[]).map((item) => [normalizedName(item.name), item.id]),
  );

  await syncRows(
    client,
    "plan_attractions",
    attractions.map(([name, displayOrder, facilityName]) => ({
      name,
      display_order: displayOrder,
      is_active: true,
      facility_id: facilityName ? facilityIds.get(normalizedName(facilityName)) ?? null : null,
    })),
  );

  const [{ count: facilityCount, error: facilityCountError }, { count: attractionCount, error: attractionCountError }] = await Promise.all([
    client.from("plan_facilities").select("id", { count: "exact", head: true }).eq("is_active", true),
    client.from("plan_attractions").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);
  if (facilityCountError || attractionCountError) {
    throw new Error(facilityCountError?.message || attractionCountError?.message || "登録件数を確認できませんでした。");
  }
  console.log(JSON.stringify({ facilities: facilityCount, attractions: attractionCount }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
