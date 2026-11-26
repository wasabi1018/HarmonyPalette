import { getPublicHotelCatalog } from "@/lib/hotels/repository";
import { hotelArticle, hotelArticlePath } from "@/lib/hotels/model";

// Compatibility for old links; there is no standalone hotel detail document.
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const catalog = await getPublicHotelCatalog();
  const hotel = catalog.hotels.find((item) => item.slug === slug);
  if (!hotel) return new Response(null, { status: 404, headers: { "X-Robots-Tag": "noindex" } });
  const article = hotelArticle(hotel, catalog.articles);
  return new Response(null, {
    status: 307,
    headers: {
      Location: article ? hotelArticlePath(article) : `/hotels#hotel-${hotel.slug}`,
      "X-Robots-Tag": "noindex",
    },
  });
}
