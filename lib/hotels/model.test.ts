import test from "node:test";
import assert from "node:assert/strict";
import {
  currentImages,
  driveLabel,
  filterHotels,
  isActivePr,
  parseHotel,
  hotelArticle,
  hotelArticlePath,
} from "./model";
import { starterHotels } from "./starters";
import { parseHotelEvents } from "./events";
test("six starters stay draft, with genuine existing link material and sourced times only", () => {
  const hotels = starterHotels().map(parseHotel);
  assert.equal(hotels.length, 6);
  assert.ok(
    hotels.every((h) => h.status === "draft" && !h.allowIndex && !h.prEnabled),
  );
  assert.equal(hotels[2].driveMinutes, null);
  assert.equal(driveLabel(hotels[2]), "所要時間未確認");
  assert.throws(() => parseHotel({ ...hotels[0], driveSourceUrl: "" }));
  assert.throws(() =>
    parseHotel({ ...hotels[0], driveCheckedOn: "2026-02-30" }),
  );
  assert.throws(() => parseHotel({ ...hotels[0], bookingLinks: [] }));
});
test("tag AND, area OR, sourced near rule, and unverified times last", () => {
  const hotels = starterHotels().map((h) => ({
    ...h,
    status: "published" as const,
  }));
  const ordered = filterHotels(hotels, [], [], "near");
  assert.equal(ordered[0].slug, "fico-hiji");
  assert.equal(ordered.at(-1)?.driveMinutes, null);
  assert.equal(
    filterHotels(
      hotels,
      ["hiji", "beppu"],
      ["bath", "free-parking"],
      "recommended",
    ).length,
    2,
  );
  assert.ok(
    filterHotels(hotels, [], ["nearby"], "recommended").every(
      (h) => (h.driveMinutesMax ?? h.driveMinutes ?? Infinity) <= 20,
    ),
  );
});
test("PR is active only in its half-open interval and images expire in Japan", () => {
  const hotel = {
    ...starterHotels()[0],
    status: "published" as const,
    prEnabled: true,
    prStartsAt: "2026-11-24T00:00:00Z",
    prEndsAt: "2026-11-25T00:00:00Z",
    disclosure: "広告",
  };
  assert.equal(isActivePr(hotel, Date.parse(hotel.prStartsAt)), true);
  assert.equal(isActivePr(hotel, Date.parse(hotel.prEndsAt)), false);
  assert.equal(
    isActivePr({ ...hotel, status: "draft" }, Date.parse(hotel.prStartsAt)),
    false,
  );
  hotel.images[0].expiresOn = "2026-11-24";
  assert.equal(
    currentImages(hotel, new Date("2026-11-24T14:59:00Z")).length,
    1,
  );
  assert.equal(
    currentImages(hotel, new Date("2026-11-24T15:00:00Z")).length,
    0,
  );
});
test("rejects unsafe links, mismatched images and oversized analytics batches", () => {
  const hotel = starterHotels()[0];
  assert.throws(() =>
    parseHotel({ ...hotel, officialUrl: "javascript:alert(1)" }),
  );
  assert.throws(() =>
    parseHotel({
      ...hotel,
      images: [{ ...hotel.images[0], url: "https://example.com/photo.jpg" }],
    }),
  );
  assert.equal(parseHotel({ ...hotel, whyStay: "", allowIndex: true }).allowIndex, false);
  assert.throws(() => parseHotelEvents(Array(41).fill({})));
  assert.throws(() =>
    parseHotelEvents([
      {
        event: "revenue",
        hotelId: "",
        provider: "",
        source: "direct",
        placement: "list",
      },
    ]),
  );
});

test("article buttons require an explicitly selected, already published article", () => {
  const article = {
    id: "8aff0000-0000-4000-8000-000000000011",
    title: "確認用ホテル紹介", slug: "hotel-review",
    status: "published", publishedAt: "2026-11-24T00:00:00Z",
  };
  const hotel = parseHotel({ ...starterHotels()[0], articleId: article.id });
  const now = Date.parse("2026-11-25T00:00:00Z");
  assert.equal(hotelArticle(hotel, [article], now)?.id, article.id);
  assert.equal(hotelArticle({ articleId: "" }, [article], now), undefined);
  assert.equal(hotelArticle(hotel, [], now), undefined);
  for (const change of [
    { status: "draft" }, { status: "scheduled" }, { publishedAt: null },
    { publishedAt: "2035-01-01T00:00:00Z" }, { publishedAt: "invalid" }, { slug: "" },
  ]) assert.equal(hotelArticle(hotel, [{ ...article, ...change }], now), undefined);
  assert.equal(hotelArticlePath(article), "/articles/hotel-review");
  assert.equal(hotelArticlePath({ slug: "../../external" }), "/articles/..%2F..%2Fexternal");
  assert.throws(() => parseHotel({ ...hotel, articleId: "https://example.com" }));
  // Pre-existing records without the new JSON field remain readable.
  const { articleId: _articleId, ...legacy } = hotel;
  void _articleId;
  assert.equal(parseHotel(legacy).articleId, "");
});
