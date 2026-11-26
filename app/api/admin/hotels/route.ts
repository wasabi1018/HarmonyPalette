import { revalidatePath, revalidateTag } from "next/cache";
import { authorizeTravelAdmin, limitedBody } from "@/lib/travel/admin-request";
import {
  getHotelMetrics,
  HOTEL_CACHE_TAG,
  readHotelCatalog,
  saveHotel,
  saveHotelMaster,
  setHotelDeleted,
} from "@/lib/hotels/repository";
import { parseHotelMaster, UUID_RE } from "@/lib/hotels/model";
import { starterHotels } from "@/lib/hotels/starters";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const denied = await authorizeTravelAdmin(request);
  if (denied) return denied;
  try {
    return Response.json(
      {
        catalog: await readHotelCatalog(true),
        metrics: await getHotelMetrics(30),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "取得に失敗しました。" },
      { status: 503 },
    );
  }
}
export async function POST(request: Request) {
  const denied = await authorizeTravelAdmin(request, true);
  if (denied) return denied;
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return Response.json(
      { error: "JSONで送信してください。" },
      { status: 415 },
    );
  let data;
  try {
    data = JSON.parse(
      new TextDecoder().decode(await limitedBody(request, 150000)),
    );
  } catch {
    return Response.json(
      { error: "入力形式・容量を確認してください。" },
      { status: 400 },
    );
  }
  try {
    if (data.action === "save") await saveHotel(data.hotel);
    else if (data.action === "master" && ["areas", "tags"].includes(data.kind))
      await saveHotelMaster(data.kind, parseHotelMaster(data.item));
    else if (data.action === "delete" || data.action === "restore") {
      if (
        !UUID_RE.test(data.id) ||
        typeof data.updatedAt !== "string" ||
        !Number.isFinite(Date.parse(data.updatedAt))
      )
        throw new Error("対象のホテルを確認してください。");
      await setHotelDeleted(data.id, data.action === "delete", data.updatedAt);
    } else if (data.action === "starters") {
      const { hotels } = await readHotelCatalog(true);
      for (const hotel of starterHotels())
        if (!hotels.some((h) => h.id === hotel.id || h.slug === hotel.slug))
          await saveHotel(hotel);
    } else
      return Response.json(
        { error: "操作が正しくありません。" },
        { status: 400 },
      );
    revalidateTag(HOTEL_CACHE_TAG);
    revalidatePath("/hotels");
    revalidatePath("/sitemap.xml");
    revalidatePath("/plan/trips");
    return Response.json({
      catalog: await readHotelCatalog(true),
      metrics: await getHotelMetrics(30),
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "保存に失敗しました。" },
      { status: 400 },
    );
  }
}
