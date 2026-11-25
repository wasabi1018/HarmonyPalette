import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CarFront,
  ChevronRight,
  ExternalLink,
  MapPin,
  Sparkles,
} from "lucide-react";
import {
  BookingButton,
  HotelMedia,
  HotelPrNotice,
} from "@/components/hotels/hotel-catalog";
import { HotelView } from "@/components/hotels/telemetry";
import {
  canIndexHotel,
  currentImages,
  driveLabel,
  FACT_LABELS,
  type Hotel,
} from "@/lib/hotels/model";
import { getPublicHotelCatalog } from "@/lib/hotels/repository";
import { siteUrl } from "@/lib/site-config";
import css from "@/components/hotels/hotels.module.css";
export const revalidate = 86400;
export async function generateStaticParams() {
  return (await getPublicHotelCatalog()).hotels.map((h) => ({ slug: h.slug }));
}
async function findHotel(slug: string) {
  return (await getPublicHotelCatalog()).hotels.find((h) => h.slug === slug);
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const h = await findHotel((await params).slug);
  if (!h) return { title: "ホテルが見つかりません", robots: { index: false } };
  const title = h.seoTitle || `${h.name}｜ハーモニーランド旅行のホテルガイド`;
  const description = h.seoDescription || `${h.summary} ${h.highlight}`;
  return {
    title,
    description,
    alternates: { canonical: `/hotels/${h.slug}` },
    robots: { index: h.allowIndex && canIndexHotel(h), follow: true },
    openGraph: {
      type: "website",
      title,
      description,
      url: siteUrl(`/hotels/${h.slug}`),
      images: [{ url: siteUrl("/logo-hero.png") }],
    },
  };
}
function BookingPanel({ hotel }: { hotel: Hotel }) {
  return (
    <>
      <h2>料金・空室を確認する</h2>
      <p className={css.muted}>
        宿泊日と人数を指定して、予約サイトで最新のプランをご確認ください。
      </p>
      <div className={css.bookingList}>
        <BookingButton hotel={hotel} all />
      </div>
      {!hotel.bookingLinks.length && (
        <p className={css.muted}>宿泊プランは公式サイトでご確認ください。</p>
      )}
      {hotel.officialUrl && (
        <a
          className={css.official}
          href={hotel.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          ホテル公式サイト
          <ExternalLink size={12} aria-hidden="true" />
        </a>
      )}
    </>
  );
}
export default async function HotelDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const catalog = await getPublicHotelCatalog();
  // Resolve params before lookup; the catalog stays shared with metadata through the cache.
  const slug = (await params).slug;
  const hotel = catalog.hotels.find((item) => item.slug === slug);
  if (!hotel) notFound();
  const area =
    catalog.areas.find((a) => a.id === hotel.areaId)?.name ?? "周辺エリア";
  const json = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Hotel",
        "@id": `${siteUrl(`/hotels/${hotel.slug}`)}#hotel`,
        name: hotel.name,
        description: hotel.summary,
        url: hotel.officialUrl,
        ...(hotel.address
          ? {
              address: {
                "@type": "PostalAddress",
                streetAddress: hotel.address,
                addressCountry: "JP",
              },
            }
          : {}),
      },
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
          {
            "@type": "ListItem",
            position: 3,
            name: hotel.name,
            item: siteUrl(`/hotels/${hotel.slug}`),
          },
        ],
      },
    ],
  };
  const notes = [
    ["ハーモニーランド旅行におすすめする理由", hotel.whyStay],
    ["子連れ旅行のメリット・注意点", hotel.familyNotes],
    ["開園時間に合わせた朝の移動", hotel.morningNotes],
    ["ナイト営業を楽しんだあとの宿泊", hotel.nightNotes],
    ["こんな旅行者におすすめ", hotel.audience],
  ];
  return (
    <div className={css.page}>
      <HotelView id={hotel.id} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(json).replace(/</g, "\\u003c"),
        }}
      />
      <nav aria-label="パンくずリスト" className={css.breadcrumb}>
        <Link href="/">ホーム</Link>
        <ChevronRight size={11} aria-hidden="true" />
        <Link href="/hotels">周辺ホテル</Link>
        <ChevronRight size={11} aria-hidden="true" />
        <span aria-current="page">{hotel.name}</span>
      </nav>
      <header className={css.detailHeader}>
        <p className={css.eyebrow}>HARMONY PALETTE HOTEL GUIDE</p>
        <p className={css.area}>
          <MapPin size={12} aria-hidden="true" />
          {area}
        </p>
        <h1>{hotel.name}</h1>
        <p>{hotel.summary}</p>
        <div className={css.drive}>
          <CarFront size={18} aria-hidden="true" />
          ハーモニーランドまで {driveLabel(hotel)}
        </div>
        <div className={css.cardTags}>
          {catalog.tags
            .filter((t) => hotel.tagIds.includes(t.id))
            .map((t) => (
              <span className={css.tag} key={t.id}>
                {t.name}
              </span>
            ))}
        </div>
        <div className={css.highlight + " mt-4"}>
          <strong>
            <Sparkles size={13} aria-hidden="true" />
            ハーモニーランド旅行なら
          </strong>
          {hotel.highlight}
        </div>
        <p className={css.verification}>
          情報の最終確認日：
          {hotel.verifiedOn ? (
            <time dateTime={hotel.verifiedOn}>
              {hotel.verifiedOn.replaceAll("-", "/")}
            </time>
          ) : (
            "未確認"
          )}
        </p>
        <HotelPrNotice hotel={hotel} />
        {currentImages(hotel).length > 0 && (
          <div className={css.gallery}>
            {currentImages(hotel).map((image) => (
              <figure key={image.id}>
                <HotelMedia hotel={hotel} image={image} />
                <figcaption>{image.credit}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </header>
      <p className={css.disclosure}>
        本ページにはアフィリエイト広告が含まれています。
      </p>
      <div className={css.detailLayout}>
        <div>
          <section className={css.detailSection}>
            <h2>ハーモニーランド旅行者目線のポイント</h2>
            {notes.some(([, text]) => text) ? (
              notes
                .filter(([, text]) => text)
                .map(([title, text]) => (
                  <div key={title}>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                ))
            ) : (
              <p>
                旅行に役立つ情報を確認中です。宿泊条件はホテル公式サイトでご確認ください。
              </p>
            )}
          </section>
          <section className={css.detailSection}>
            <h2>アクセス・ホテル基本情報</h2>
            <dl className={css.facts}>
              <div className={css.factRow}>
                <dt>ハーモニーランドまで</dt>
                <dd>
                  <strong>{driveLabel(hotel)}</strong>
                  {hotel.driveNote && (
                    <p className={css.muted}>{hotel.driveNote}</p>
                  )}
                  {hotel.driveSourceUrl && (
                    <a
                      className={css.official}
                      href={hotel.driveSourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      所要時間の確認元
                      <ExternalLink size={11} aria-hidden="true" />
                    </a>
                  )}
                  {hotel.driveCheckedOn && (
                    <p className={css.muted}>確認日：{hotel.driveCheckedOn}</p>
                  )}
                </dd>
              </div>
              <div className={css.factRow}>
                <dt>所在地</dt>
                <dd>{hotel.address || "未確認"}</dd>
              </div>
              {(
                Object.entries(FACT_LABELS) as [
                  keyof typeof FACT_LABELS,
                  string,
                ][]
              ).map(([key, label]) => (
                <div className={css.factRow} key={key}>
                  <dt>{label}</dt>
                  <dd>{hotel.facts[key] || "未確認"}</dd>
                </div>
              ))}
            </dl>
            <p className={css.muted}>
              道路状況・経路によって所要時間は変わります。設備・添い寝・食事・貸出品は客室や宿泊プランにより条件が異なります。
            </p>
          </section>
          {hotel.sources.length > 0 && (
            <section className={css.detailSection}>
              <h2>情報の確認元</h2>
              <p className={css.muted}>
                公式情報を参考に、Harmony Paletteが旅行者向けに整理しています。
              </p>
              <ul className={css.sourceList}>
                {hotel.sources.map((source, i) => (
                  <li key={i}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {source.label} ↗
                    </a>
                    <br />
                    確認日：{source.checkedOn}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <aside className={css.aside}>
          <section className={css.detailSection}>
            <BookingPanel hotel={hotel} />
          </section>
        </aside>
      </div>
      <section className={css.detailFooter}>
        <BookingPanel hotel={hotel} />
      </section>
      <Link href="/hotels" className={css.back}>
        <ArrowLeft size={16} aria-hidden="true" />
        ホテル一覧に戻る
      </Link>
    </div>
  );
}
