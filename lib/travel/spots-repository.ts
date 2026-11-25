import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ArticleTravel } from "./spots";

export const missingTravelSchema = (error: { code?: string } | null) =>
  !!error && ["42P01", "PGRST205", "PGRST202"].includes(error.code || "");

export async function articleTravel(
  client: SupabaseClient,
  id: string,
): Promise<ArticleTravel | undefined> {
  const [meta, links] = await Promise.all([
    (async () => {
      const result = await client.from("article_travel_metadata").select("disclosure,show_hotel_guide").eq("article_id", id).maybeSingle();
      // Older deployments keep existing article/PR metadata working until migration.
      if (result.error && ["42703", "PGRST204"].includes(result.error.code)) return client.from("article_travel_metadata").select("disclosure").eq("article_id", id).maybeSingle();
      return result;
    })(),
    client.from("article_spots").select("spot_id").eq("article_id", id),
  ]);
  if (missingTravelSchema(meta.error) || missingTravelSchema(links.error))
    return undefined;
  if (meta.error || links.error)
    throw new Error("記事の施設連携情報を取得できませんでした。");
  return {
    disclosure: meta.data?.disclosure || "",
    spotIds: (links.data || []).map((r) => r.spot_id as string),
    ...((meta.data as { show_hotel_guide?: boolean } | null)?.show_hotel_guide ? { showHotelGuide: true } : {}),
  };
}
