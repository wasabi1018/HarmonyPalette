"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CarFront,
  Check,
  ChevronDown,
  ExternalLink,
  Heart,
  Hotel as HotelIcon,
  MapPin,
  SlidersHorizontal,
} from "lucide-react";
import {
  currentImages,
  driveLabel,
  filterHotels,
  hotelImageUrl,
  isActivePr,
  safeHotelUrl,
  type Hotel,
  type HotelCatalog,
  type HotelImage,
} from "@/lib/hotels/model";
import { trackHotel } from "./telemetry";
import css from "./hotels.module.css";

const SHORT_TAG_LABELS: Record<string, string> = {
  nearby: "パークに近い",
  family: "子連れ",
  bath: "温泉",
};

export function useHotelClock(hotels: Hotel[]) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      const boundary = hotels
        .flatMap((h) => [h.prStartsAt, h.prEndsAt])
        .filter((v): v is string => !!v)
        .map(Date.parse)
        .filter((t) => t > time)
        .sort((a, b) => a - b)[0];
      timer = setTimeout(
        tick,
        Math.min(60000, boundary ? Math.max(25, boundary - time + 10) : 60000),
      );
    };
    const visible = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        tick();
      }
    };
    tick();
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [hotels]);
  return now;
}
function onBooking(
  h: Hotel,
  provider: string,
  placement: "list" | "detail" | "pr",
) {
  trackHotel("booking_click", h.id, provider, placement);
  if (isActivePr(h, Date.now()))
    trackHotel("pr_click", h.id, provider, placement);
}
export function BookingButton({
  hotel,
  placement = "detail",
  all = false,
}: {
  hotel: Hotel;
  placement?: "list" | "detail" | "pr";
  all?: boolean;
}) {
  const validLinks = hotel.bookingLinks.filter((link) => {
    try {
      return Boolean(safeHotelUrl(link.url));
    } catch {
      return false;
    }
  });
  const links = all
    ? validLinks
    : [validLinks.find((b) => b.primary) ?? validLinks[0]].filter(Boolean);
  return (
    <>
      {links.map((link) => (
        <a
          key={link.id}
          className={css.booking}
          href={link.url}
          target="_blank"
          rel="sponsored noopener noreferrer"
          onClick={() => onBooking(hotel, link.provider, placement)}
        >
          {link.label}で料金・空室を確認
          <ExternalLink size={13} className="shrink-0" aria-hidden="true" />
        </a>
      ))}
    </>
  );
}
export function HotelMedia({
  hotel,
  image,
  card = false,
  preview = false,
}: {
  hotel: Hotel;
  image?: HotelImage;
  card?: boolean;
  preview?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  let safeImage = true;
  if (image?.kind === "rakuten") {
    try {
      const url = new URL(safeHotelUrl(image.url));
      safeImage =
        url.hostname === "hbb.afl.rakuten.co.jp" &&
        url.pathname.startsWith("/hgb/");
    } catch {
      safeImage = false;
    }
  }
  if (!image || failed || !safeImage)
    return (
      <div className={css.placeholder} aria-label="ホテル写真準備中">
        <HotelIcon size={30} strokeWidth={1.3} aria-hidden="true" />
        <span>写真準備中</span>
      </div>
    );
  const picture = (
    <div
      className={`${css.photo} ${image.kind === "rakuten" ? css.rakuten : ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${hotelImageUrl(hotel.id, image, card)}${preview && image.kind === "upload" ? `${card ? "&" : "?"}preview=1` : ""}`}
        alt={image.alt}
        loading="lazy"
        decoding="async"
        width={card ? 480 : 1440}
        height={card ? 480 : 1080}
        onError={() => setFailed(true)}
      />
      {image.kind === "rakuten" && (
        <span className={css.photoCredit}>楽天トラベル</span>
      )}
    </div>
  );
  const link = hotel.bookingLinks.find((b) => {
    try {
      return b.id === image.bookingLinkId && Boolean(safeHotelUrl(b.url));
    } catch {
      return false;
    }
  });
  return image.kind === "rakuten" && link ? (
    <a
      href={link.url}
      rel="sponsored noopener noreferrer"
      target="_blank"
      onClick={() => onBooking(hotel, link.provider, card ? "list" : "detail")}
    >
      {picture}
    </a>
  ) : (
    picture
  );
}
function PrImpression({
  hotel,
  children,
}: {
  hotel: Hotel;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || seen.current) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (timer) clearTimeout(timer);
        if (entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.5))
          timer = setTimeout(() => {
            if (
              document.visibilityState === "visible" &&
              !seen.current &&
              isActivePr(hotel, Date.now())
            ) {
              seen.current = true;
              trackHotel("pr_impression", hotel.id, "", "pr");
              observer.disconnect();
            }
          }, 1000);
      },
      { threshold: [0, 0.5] },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [hotel]);
  return <div ref={ref}>{children}</div>;
}
function HotelCard({
  hotel,
  catalog,
  placement = "list",
  preview = false,
}: {
  hotel: Hotel;
  catalog: HotelCatalog;
  placement?: "list" | "pr";
  preview?: boolean;
}) {
  const area =
    catalog.areas.find((a) => a.id === hotel.areaId)?.name ?? "周辺エリア";
  const tags = catalog.tags.filter(
    (t) => t.id !== "nearby" && hotel.tagIds.includes(t.id),
  );
  return (
    <article className={css.card} data-hotel={hotel.slug}>
      <div className={css.cardMedia}>
        <HotelMedia
          key={`${currentImages(hotel)[0]?.id}:${currentImages(hotel)[0]?.url || currentImages(hotel)[0]?.path}`}
          hotel={hotel}
          image={currentImages(hotel)[0]}
          card
          preview={preview}
        />
      </div>
      <div className={css.cardInfo}>
        <p className={css.area}>
          <MapPin size={13} aria-hidden="true" />
          {area}
          {placement === "pr" && <span className={css.prLabel}>PR</span>}
        </p>
        <h3>
          <Link href={`/hotels/${hotel.slug}`}>{hotel.name}</Link>
        </h3>
        <p className={css.drive}>
          <CarFront size={17} aria-hidden="true" />
          <span className={css.driveCaption}>ハーモニーランドまで</span>
          <strong>{driveLabel(hotel)}</strong>
        </p>
        <div className={css.cardTags}>
          {tags.slice(0, 3).map((tag) => (
            <span className={css.tag} key={tag.id} aria-label={tag.name}>
              {SHORT_TAG_LABELS[tag.id] ?? tag.name}
            </span>
          ))}
        </div>
        <p className={css.cardPoint}>{hotel.highlight || hotel.summary}</p>
      </div>
      <div className={css.actions}>
        <Link href={`/hotels/${hotel.slug}`} className={css.detailLink}>
          詳細を見る
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <BookingButton hotel={hotel} placement={placement} />
      </div>
    </article>
  );
}
export function HotelPrNotice({ hotel }: { hotel: Hotel }) {
  const hotels = useRef([hotel]).current;
  const now = useHotelClock(hotels);
  return hotel.disclosure ? (
    <p className={css.prText}>
      {now !== null && isActivePr(hotel, now) && (
        <>
          <span className={css.prLabel}>PR掲載中</span>{" "}
        </>
      )}
      {hotel.disclosure}
    </p>
  ) : null;
}
export function HotelCatalogView({
  catalog,
  preview = false,
}: {
  catalog: HotelCatalog;
  preview?: boolean;
}) {
  const [areaIds, setAreaIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [order, setOrder] = useState("recommended");
  const [expanded, setExpanded] = useState(false);
  const [areasExpanded, setAreasExpanded] = useState(false);
  const conditionsButton = useRef<HTMLButtonElement>(null);
  const now = useHotelClock(catalog.hotels);
  useEffect(() => {
    const read = () => {
      const params = new URLSearchParams(location.hash.slice(1));
      setAreaIds(
        (params.get("areas") ?? "")
          .split(",")
          .filter((id) => catalog.areas.some((a) => a.id === id)),
      );
      setTagIds(
        (params.get("tags") ?? "")
          .split(",")
          .filter((id) => catalog.tags.some((t) => t.id === id)),
      );
      setOrder(params.get("sort") === "near" ? "near" : "recommended");
    };
    read();
    window.addEventListener("hashchange", read);
    window.addEventListener("popstate", read);
    return () => {
      window.removeEventListener("hashchange", read);
      window.removeEventListener("popstate", read);
    };
  }, [catalog.areas, catalog.tags]);
  function change(areas: string[], tags: string[], sort: string) {
    setAreaIds(areas);
    setTagIds(tags);
    setOrder(sort);
    const params = new URLSearchParams();
    if (areas.length) params.set("areas", areas.join(","));
    if (tags.length) params.set("tags", tags.join(","));
    if (sort !== "recommended") params.set("sort", sort);
    history.replaceState(
      null,
      "",
      `${location.pathname}${location.search}${params.size ? `#${params}` : ""}`,
    );
  }
  const toggle = (ids: string[], id: string) =>
    ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
  const filtered = filterHotels(catalog.hotels, areaIds, tagIds, order);
  const recommended = filterHotels(catalog.hotels, [], [], "recommended")
    .filter((h) => h.recommended)
    .slice(0, 2);
  const pr =
    now === null
      ? []
      : filtered
          .filter((h) => isActivePr(h, now))
          .sort((a, b) => a.prOrder - b.prOrder);
  const tags = catalog.tags.filter((t) => t.active);
  const areas = catalog.areas.filter((a) => a.active);
  const quickTags = ["nearby", "family", "bath"]
    .map((id) => tags.find((tag) => tag.id === id))
    .filter((tag) => tag !== undefined);
  const selectedAreas = areas.filter((area) => areaIds.includes(area.id));
  const hiddenTagCount = tagIds.filter(
    (id) => !quickTags.some((tag) => tag.id === id),
  ).length;
  const areaChips = areas.map((area) => (
    <button
      type="button"
      key={area.id}
      className={css.chip}
      aria-pressed={areaIds.includes(area.id)}
      onClick={() => change(toggle(areaIds, area.id), tagIds, order)}
    >
      {area.name}
    </button>
  ));
  return (
    <>
      <section className={css.catalogHero} aria-labelledby="hotels-heading">
        <h1 id="hotels-heading">ハーモニーランド周辺のホテルガイド</h1>
        <p>移動時間と、家族の過ごしやすさで選ぶ。</p>
      </section>
      <p className={css.disclosure}>
        本ページにはアフィリエイト広告が含まれています。
      </p>
      <section
        className={css.catalogFilters}
        aria-labelledby="hotel-filter-heading"
      >
        <h2 id="hotel-filter-heading" className="sr-only">
          ホテルを条件で絞り込む
        </h2>
        <div className={css.quickFilters}>
          <div className={css.chips}>
            {quickTags.map((tag) => (
              <button
                type="button"
                className={css.chip}
                key={tag.id}
                aria-pressed={tagIds.includes(tag.id)}
                aria-label={tag.name}
                onClick={() => change(areaIds, toggle(tagIds, tag.id), order)}
              >
                {tagIds.includes(tag.id) && (
                  <Check size={12} aria-hidden="true" />
                )}
                {SHORT_TAG_LABELS[tag.id]}
              </button>
            ))}
          </div>
          <button
            ref={conditionsButton}
            type="button"
            className={`${css.chip} ${css.conditions}`}
            aria-expanded={expanded}
            aria-controls="hotel-all-conditions"
            onClick={() => setExpanded((v) => !v)}
          >
            <SlidersHorizontal size={14} aria-hidden="true" />
            条件{hiddenTagCount > 0 ? ` ${hiddenTagCount}` : ""}
          </button>
        </div>
        <div
          id="hotel-all-conditions"
          className={css.conditionPanel}
          hidden={!expanded}
        >
          <div className={css.filterHeading}>
            <h3>ホテルの特徴</h3>
            <button
              type="button"
              className={css.clear}
              onClick={() => change([], [], order)}
            >
              条件をクリア
            </button>
          </div>
          <div className={css.chips}>
            {tags.map((tag) => (
              <button
                type="button"
                key={tag.id}
                className={css.chip}
                aria-pressed={tagIds.includes(tag.id)}
                onClick={() => change(areaIds, toggle(tagIds, tag.id), order)}
              >
                {tagIds.includes(tag.id) && (
                  <Check size={12} aria-hidden="true" />
                )}
                {tag.name}
              </button>
            ))}
          </div>
          <p className={css.filterNote}>
            複数の特徴をすべて満たすホテルを表示します。「パークに近い」は確認済みの車移動が20分以内の施設です。
          </p>
          <button
            type="button"
            className={css.closeConditions}
            onClick={() => {
              setExpanded(false);
              conditionsButton.current?.focus();
            }}
          >
            条件を閉じる<ChevronDown size={13} aria-hidden="true" />
          </button>
        </div>
      </section>
      {recommended.length > 0 && !areaIds.length && !tagIds.length && (
        <details className={css.picks}>
          <summary>
            <Heart size={14} aria-hidden="true" />
            編集部のおすすめ
            <span>{recommended.length}施設</span>
            <ChevronDown size={13} aria-hidden="true" />
          </summary>
          <div className={css.featured}>
            {recommended.map((h) => (
              <article key={h.id} className={css.feature}>
                <small>HARMONY PALETTE PICK</small>
                <Link href={`/hotels/${h.slug}`}>
                  {h.name}
                  <ArrowRight
                    size={12}
                    className="ml-1 inline"
                    aria-hidden="true"
                  />
                </Link>
                <p>{h.highlight}</p>
              </article>
            ))}
          </div>
        </details>
      )}
      {pr.length > 0 && (
        <section className={css.prBlock}>
          <h2>
            <span className={css.prLabel}>広告</span>PR掲載ホテル
          </h2>
          <p className={css.sectionNote}>
            広告契約に基づく掲載です。編集部おすすめとは別の枠でご紹介しています。
          </p>
          <div className={css.grid}>
            {pr.map((h) => (
              <PrImpression key={h.id} hotel={h}>
                <HotelCard
                  hotel={h}
                  catalog={catalog}
                  placement="pr"
                  preview={preview}
                />
              </PrImpression>
            ))}
          </div>
        </section>
      )}
      <section aria-labelledby="hotel-results-heading">
        <div className={css.toolbar}>
          <button
            type="button"
            className={css.areaToggle}
            aria-expanded={areasExpanded}
            aria-controls="hotel-area-conditions"
            onClick={() => setAreasExpanded((value) => !value)}
          >
            エリア：{selectedAreas.length
              ? selectedAreas.map((area) => area.name).join("・")
              : "すべて"}
            <ChevronDown size={13} aria-hidden="true" />
          </button>
          <h2 id="hotel-results-heading">
            <span className="sr-only">ホテル一覧 </span>
            <span role="status" aria-live="polite">
              {filtered.length}施設
            </span>
          </h2>
          <span className={css.sortDivider} aria-hidden="true">/</span>
          <label>
            <span className="sr-only">ホテルの並べ替え</span>
            <select
              value={order}
              onChange={(e) => change(areaIds, tagIds, e.target.value)}
            >
              <option value="recommended">おすすめ順</option>
              <option value="near">近い順</option>
            </select>
          </label>
        </div>
        <div
          id="hotel-area-conditions"
          className={css.areaPanel}
          hidden={!areasExpanded}
        >
          <div className={css.chips}>
            <button
              type="button"
              className={css.chip}
              aria-pressed={!areaIds.length}
              onClick={() => change([], tagIds, order)}
            >
              すべて
            </button>
            {areaChips}
          </div>
          <p className={css.filterNote}>複数のエリアを選べます。</p>
        </div>
        {(areaIds.length > 0 || tagIds.length > 0) && (
          <div className={css.selectionSummary}>
            <span>
              {[
                ...selectedAreas.map((area) => area.name),
                ...tags.filter((tag) => tagIds.includes(tag.id)).map((tag) => tag.name),
              ].join("・")}
            </span>
            <button
              type="button"
              className={css.clear}
              onClick={() => change([], [], order)}
            >
              条件をクリア
            </button>
          </div>
        )}
        {filtered.length ? (
          <div className={css.grid}>
            {filtered.map((h) => (
              <HotelCard
                key={h.id}
                hotel={h}
                catalog={catalog}
                preview={preview}
              />
            ))}
          </div>
        ) : (
          <div className={css.empty}>
            {catalog.available ? (
              catalog.hotels.length ? (
                <>
                  条件に合うホテルが見つかりませんでした。
                  <br />
                  <button
                    className={css.clear}
                    onClick={() => change([], [], "recommended")}
                  >
                    条件を解除してすべて見る
                  </button>
                </>
              ) : (
                <>
                  ホテルガイドを準備しています。
                  <br />
                  確認が完了したホテルから順次ご紹介します。
                </>
              )
            ) : (
              <>
                ホテル情報をただいま確認しています。
                <br />
                時間をおいて、もう一度お試しください。
              </>
            )}
          </div>
        )}
        <p className="mt-3 text-[10px] leading-5 text-ink/60">
          所要時間はホテル公式案内などで確認した目安です。道路状況・経路で変わります。料金・空室・宿泊条件は予約サイトでご確認ください。
        </p>
      </section>
      <section className={css.guide}>
        <h2>ハーモニーランド旅行の、ホテル選びのヒント</h2>
        <div className={css.guideGrid}>
          <div>
            <h3>開園から楽しみたいなら</h3>
            <p>
              前泊なら、朝食・チェックアウト・移動の時間をまとめて考えると安心。車の所要時間に加え、駐車や入園準備の時間も見込んで選びましょう。
            </p>
          </div>
          <div>
            <h3>ナイト営業まで楽しむなら</h3>
            <p>
              パークからの距離だけでなく、最終チェックインや夕食の受付も確認。到着が遅くなる日は、ホテルへ事前に相談しておくと予定を組みやすくなります。
            </p>
          </div>
          <div>
            <h3>子ども連れで泊まるなら</h3>
            <p>
              添い寝の対象年齢・人数、食事代、寝具はプランごとに異なります。子どもの年齢を入力し、ベッドガードなどの貸出品も予約前に確認しましょう。
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
