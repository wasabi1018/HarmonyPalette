import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { HotelCatalogView } from "@/components/hotels/hotel-catalog";
import { HotelView } from "@/components/hotels/telemetry";
import { getPublicHotelCatalog } from "@/lib/hotels/repository";
import { siteUrl } from "@/lib/site-config";
import { hotelArticle, hotelArticlePath } from "@/lib/hotels/model";
import css from "@/components/hotels/hotels.module.css";
export const revalidate = 86400;
export async function generateMetadata(): Promise<Metadata> {
  const catalog = await getPublicHotelCatalog();
  const title = "ハーモニーランド周辺のホテルガイド";
  const description =
    "ハーモニーランド周辺のホテルを、車での所要時間・子連れ向け設備・温泉・エリアで比較。前泊やナイト営業後の宿泊先選びに役立つHarmony Palette独自のガイドです。";
  return {
    title,
    description,
    alternates: { canonical: "/hotels" },
    robots: { index: catalog.hotels.length > 0, follow: true },
    openGraph: {
      type: "website",
      title,
      description,
      url: siteUrl("/hotels"),
      images: [{ url: siteUrl("/logo-hero.png") }],
    },
  };
}
export default async function HotelsPage() {
  const catalog = await getPublicHotelCatalog();
  const json = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "ホーム",
            item: siteUrl("/"),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "周辺ホテル",
            item: siteUrl("/hotels"),
          },
        ],
      },
      {
        "@type": "ItemList",
        name: "ハーモニーランド周辺のホテル",
        itemListElement: catalog.hotels.map((h, i) => {
          const article = hotelArticle(h, catalog.articles);
          return ({
          "@type": "ListItem",
          position: i + 1,
          name: h.name,
          url: siteUrl(article ? hotelArticlePath(article) : `/hotels#hotel-${h.slug}`),
          });
        }),
      },
    ],
  };
  return (
    <div className={`${css.page} ${css.catalogPage}`} data-hotel-catalog-page>
      <HotelView />
      <nav className={css.breadcrumb} aria-label="パンくずリスト">
        <Link href="/">ホーム</Link>
        <ChevronRight size={11} aria-hidden="true" />
        <span aria-current="page">周辺ホテル</span>
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(json).replace(/</g, "\\u003c"),
        }}
      />
      <HotelCatalogView catalog={catalog} />
    </div>
  );
}
