import { getAdminAccess } from "@/lib/supabase/auth-server";
import { unstable_cache } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { currentImages, UUID_RE } from "@/lib/hotels/model";
import {
  getPublicHotelCatalog,
  readHotelCatalog,
  HOTEL_CACHE_TAG,
} from "@/lib/hotels/repository";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const loadImageBytes = unstable_cache(
  async (path: string) => {
    const client = getSupabaseAdminClient();
    if (!client) throw new Error("Image storage unavailable");
    const { data, error } = await client.storage
      .from("hotel-images")
      .download(path);
    if (error || !data) throw new Error("Image unavailable");
    return Buffer.from(await data.arrayBuffer()).toString("base64");
  },
  ["hotel-image-bytes-v1"],
  { revalidate: 86400, tags: [HOTEL_CACHE_TAG] },
);
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  const { id, imageId } = await params;
  const missing = () =>
    new Response(null, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  if (!UUID_RE.test(id) || !UUID_RE.test(imageId)) return missing();
  const url = new URL(request.url);
  const preview = url.searchParams.get("preview") === "1";
  if (preview && !(await getAdminAccess()).ok) return missing();
  const catalog = preview
    ? await readHotelCatalog(true)
    : await getPublicHotelCatalog();
  const hotel = catalog.hotels.find((h) => h.id === id && !h.deletedAt);
  if (!hotel) return missing();
  const image = (preview ? hotel.images : currentImages(hotel)).find(
    (p) => p.id === imageId && p.kind === "upload",
  );
  if (!image) return missing();
  const path =
    url.searchParams.get("size") === "card"
      ? image.path.replace(/\.webp$/, "-card.webp")
      : image.path;
  let data: Buffer;
  try {
    data = Buffer.from(await loadImageBytes(path), "base64");
  } catch {
    return missing();
  }
  // Private image delivery avoids stale public copies after withdrawal/rights expiry.
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
