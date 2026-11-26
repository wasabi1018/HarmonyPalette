import "server-only";
import { unstable_cache } from "next/cache";
import { PUBLIC_CACHE_TAGS } from "@/lib/public-cache";
import {
  getSupabaseAdminClient,
  getSupabaseReadClient,
} from "@/lib/supabase/server";
import {
  emptyHotel,
  parseHotel,
  type Hotel,
  type HotelCatalog,
  type HotelMaster,
  type HotelArticle,
} from "./model";

export const HOTEL_CACHE_TAG = PUBLIC_CACHE_TAGS.hotels;
export const HOTEL_SETUP_ERROR =
  "ホテル機能のマイグレーションとSupabase接続設定を確認してください。";
type Row = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
function admin() {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error(HOTEL_SETUP_ERROR);
  return client;
}
function master(r: Row): HotelMaster {
  return {
    id: str(r.id),
    name: str(r.name),
    sortOrder: Number(r.sort_order),
    active: r.active === true,
  };
}
export async function readHotelCatalog(
  adminMode = false,
): Promise<HotelCatalog> {
  const client = adminMode ? admin() : getSupabaseReadClient();
  if (!client) return { hotels: [], areas: [], tags: [], available: false };
  let hotelQuery = client
    .from("hotels")
    .select(
      "*,spot:travel_spots!inner(id,name,address,description,official_url,status,category)",
    )
    .order("sort_order");
  if (!adminMode)
    hotelQuery = hotelQuery
      .is("deleted_at", null)
      .eq("spot.status", "published")
      .eq("spot.category", "hotel");
  const results = await Promise.all([
    hotelQuery,
    client.from("hotel_areas").select("*").order("sort_order"),
    client.from("hotel_tags").select("*").order("sort_order"),
    client.from("hotel_images").select("*").order("sort_order"),
    client.from("hotel_booking_links").select("*").order("sort_order"),
    client.from("hotel_tag_relations").select("hotel_id,tag_id"),
  ]);
  if (results.some((r) => r.error)) {
    if (adminMode) throw new Error(HOTEL_SETUP_ERROR);
    // Never invent or publish starter data when the database is unavailable.
    return { hotels: [], areas: [], tags: [], available: false };
  }
  const [hotelRows, areaRows, tagRows, imageRows, linkRows, tagRelations] =
    results.map((r) => (r.data ?? []) as Row[]);
  const hotels: Hotel[] = hotelRows.flatMap((row) => {
    const spot = (
      Array.isArray(row.spot) ? row.spot[0] : row.spot
    ) as Row | null;
    if (
      !spot ||
      spot.category !== "hotel" ||
      (!adminMode && (spot.status !== "published" || row.deleted_at))
    )
      return [];
    const hid = str(row.id);
    const details =
      row.details && typeof row.details === "object"
        ? (row.details as Row)
        : {};
    const hotel = {
      ...emptyHotel(hid),
      ...details,
      id: hid,
      slug: str(row.slug),
      name: str(spot.name),
      address: str(spot.address),
      summary: str(spot.description),
      officialUrl: str(spot.official_url),
      status: spot.status,
      areaId: str(row.area_id),
      sortOrder: Number(row.sort_order),
      recommended: row.recommended === true,
      allowIndex: row.allow_index === true,
      prEnabled: row.pr_enabled === true,
      prStartsAt: row.pr_starts_at || null,
      prEndsAt: row.pr_ends_at || null,
      prOrder: Number(row.pr_order),
      driveMinutes: row.drive_minutes ?? null,
      driveMinutesMax: row.drive_minutes_max ?? null,
      images: imageRows.filter((r) => r.hotel_id === hid).map((r) => r.image),
      bookingLinks: linkRows
        .filter((r) => r.hotel_id === hid)
        .map((r) => ({
          id: str(r.id),
          provider: str(r.provider),
          label: str(r.label),
          url: str(r.url),
          primary: r.is_primary === true,
        })),
      tagIds: tagRelations
        .filter((r) => r.hotel_id === hid)
        .map((r) => str(r.tag_id)),
      updatedAt: str(row.updated_at),
    };
    try {
      return [
        {
          ...parseHotel(hotel),
          deletedAt: row.deleted_at ? str(row.deleted_at) : null,
        },
      ];
    } catch {
      if (adminMode)
        throw new Error(
          "ホテルの保存データを読み込めません。形式・掲載条件を確認してください。",
        );
      return [];
    }
  });
  const articleIds = [...new Set(hotels.map((hotel) => hotel.articleId).filter(Boolean))];
  let articles: HotelArticle[] = [];
  if (adminMode || articleIds.length) {
    let query = client.from("articles")
      .select("id,title,slug,status,published_at")
      .is("deleted_at", null);
    if (adminMode) query = query.order("updated_at", { ascending: false }).limit(1000);
    else query = query.in("id", articleIds)
      .eq("status", "published")
      .lte("published_at", new Date().toISOString());
    const { data, error } = await query;
    if (error && adminMode) throw new Error("紹介記事を取得できませんでした。時間をおいて再度お試しください。");
    if (!error) articles = (data ?? []).map((row) => ({
      id: str(row.id), title: str(row.title), slug: str(row.slug),
      status: str(row.status), publishedAt: row.published_at ? str(row.published_at) : null,
    }));
  }
  return {
    hotels,
    articles,
    areas: areaRows.map(master).filter((r) => adminMode || r.active),
    tags: tagRows.map(master).filter((r) => adminMode || r.active),
    available: true,
  };
}
export const getPublicHotelCatalog = unstable_cache(
  () => readHotelCatalog(),
  ["hotel-catalog-v2-articles"],
  { revalidate: 86400, tags: [HOTEL_CACHE_TAG] },
);
export async function saveHotel(value: unknown) {
  const hotel = parseHotel(value);
  const client = admin();
  if (hotel.articleId) {
    const { data, error } = await client.from("articles")
      .select("id").eq("id", hotel.articleId).is("deleted_at", null).maybeSingle();
    if (error || !data) throw new Error("紹介記事が見つかりません。削除されていない記事を選んでください。");
  }
  const { error } = await client.rpc("save_hotel", {
    p_input: hotel,
    p_expected_updated_at: hotel.updatedAt || null,
  });
  if (error)
    throw new Error(
      error.message.includes("hotel_stale")
        ? "別の画面で更新されています。再読み込みして変更を確認してください。"
        : error.message.includes("slug")
          ? "ホテルURLは重複できず、初回保存後は変更できません。"
          : "保存できませんでした。エリア・タグ・URL・DBの設定を確認してください。",
    );
  return hotel.id;
}
export async function setHotelDeleted(
  id: string,
  deleted: boolean,
  expected: string,
) {
  const { error } = await admin().rpc("set_hotel_deleted", {
    p_id: id,
    p_deleted: deleted,
    p_expected_updated_at: expected,
  });
  if (error)
    throw new Error(
      "削除・復元できませんでした。再読み込みして更新状況を確認してください。",
    );
}
export async function saveHotelMaster(
  kind: "areas" | "tags",
  item: HotelMaster,
) {
  const { error } = await admin()
    .from(kind === "areas" ? "hotel_areas" : "hotel_tags")
    .upsert({
      id: item.id,
      name: item.name,
      sort_order: item.sortOrder,
      active: item.active,
    });
  if (error) throw new Error("エリア・タグを保存できませんでした。");
}
export type HotelMetric = {
  event_date: string;
  event_name: string;
  hotel_id: string;
  provider: string;
  source: string;
  placement: string;
  event_count: number;
};
export async function getHotelMetrics(days = 30): Promise<HotelMetric[]> {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days + 1);
  const from = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
  }).format(date);
  const rows: HotelMetric[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin()
      .from("hotel_daily_events")
      .select("*")
      .gte("event_date", from)
      .order("event_date")
      .order("event_name")
      .order("hotel_id")
      .order("provider")
      .order("source")
      .order("placement")
      .range(offset, offset + 999);
    if (error) throw new Error(HOTEL_SETUP_ERROR);
    rows.push(...((data ?? []) as HotelMetric[]));
    if ((data?.length ?? 0) < 1000) break;
  }
  return rows;
}
