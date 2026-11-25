import assert from "node:assert/strict";
import { createHotelTestDatabase } from "./hotel-test-database";
import { starterHotels } from "../lib/hotels/starters";
import { parseHotel } from "../lib/hotels/model";
async function main() {
  const db = await createHotelTestDatabase();
  const first = parseHotel({ ...starterHotels()[0], status: "published" });
  const save = (hotel: typeof first, expected: string | null = null) =>
    db.query("select public.save_hotel($1::jsonb,$2::timestamptz)", [
      JSON.stringify(hotel),
      expected,
    ]);
  const version = async () =>
    String(
      (
        await db.query<{ v: string }>(
          "select updated_at::text v from public.hotels where id=$1",
          [first.id],
        )
      ).rows[0].v,
    );
  try {
    await db.exec("set role service_role");
    await save(first);
    await save(starterHotels()[1]);
    const original = await version();
    await assert.rejects(save({ ...first, summary: "stale" }));
    await save({ ...first, summary: "更新済み" }, original);
    await assert.rejects(save(first, original));
    const current = await version();
    await assert.rejects(
      save({ ...first, tagIds: ["nonexistent-tag"] }, current),
    );
    assert.equal(
      (
        await db.query<{ description: string }>(
          "select description from public.travel_spots where id=$1",
          [first.id],
        )
      ).rows[0].description,
      "更新済み",
    );
    await assert.rejects(save({ ...first, slug: "changed-url" }, current));
    await db.exec("reset role;set role anon");
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select count(*)::int n from public.hotels",
        )
      ).rows[0].n,
      1,
    );
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select count(*)::int n from public.hotel_booking_links",
        )
      ).rows[0].n,
      1,
    );
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select count(*)::int n from public.hotel_images",
        )
      ).rows[0].n,
      1,
    );
    await assert.rejects(save(first, current));
    await assert.rejects(db.query("select * from public.hotel_daily_events"));
    await db.exec("reset role;set role authenticated");
    await assert.rejects(save(first, current));
    await db.exec("reset role;set role service_role");
    await db.query(
      "update public.hotel_images set image=jsonb_set(image,'{expiresOn}',to_jsonb('2000-01-01'::text)) where hotel_id=$1",
      [first.id],
    );
    await db.exec("reset role;set role anon");
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select count(*)::int n from public.hotel_images",
        )
      ).rows[0].n,
      0,
    );
    await db.exec("reset role;set role service_role");
    await db.query("select public.record_hotel_events($1::jsonb)", [
      JSON.stringify([
        {
          event: "booking_click",
          hotelId: first.id,
          provider: "rakuten",
          source: "home",
          placement: "list",
        },
        {
          event: "booking_click",
          hotelId: first.id,
          provider: "rakuten",
          source: "home",
          placement: "list",
        },
        {
          event: "booking_click",
          hotelId: first.id,
          provider: "unregistered",
          source: "home",
          placement: "list",
        },
        {
          event: "hotel_view",
          hotelId: starterHotels()[1].id,
          provider: "",
          source: "direct",
          placement: "detail",
        },
        {
          event: "pr_impression",
          hotelId: first.id,
          provider: "",
          source: "direct",
          placement: "pr",
        },
      ]),
    ]);
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select sum(event_count)::int n from public.hotel_daily_events",
        )
      ).rows[0].n,
      2,
    );
    await db.query("select public.set_hotel_deleted($1,true,$2)", [
      first.id,
      await version(),
    ]);
    await db.exec("reset role;set role anon");
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select count(*)::int n from public.hotels",
        )
      ).rows[0].n,
      0,
    );
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select count(*)::int n from public.hotel_booking_links",
        )
      ).rows[0].n,
      0,
    );
    await db.exec("reset role;set role service_role");
    await db.query("select public.set_hotel_deleted($1,false,$2)", [
      first.id,
      await version(),
    ]);
    assert.equal(
      (
        await db.query<{ status: string }>(
          "select status from public.travel_spots where id=$1",
          [first.id],
        )
      ).rows[0].status,
      "draft",
    );
    await db.exec("reset role");
    const article = {
      title: "テスト記事",
      slug: "qa",
      excerpt: "",
      seoTitle: "",
      seoDescription: "",
      contentJson: { type: "doc" },
      contentHtml: "<p>test</p>",
      status: "draft",
      destination: "articles",
      publishedAt: null,
      coverImageUrl: "",
      seriesId: null,
      seriesOrder: null,
      tagIds: [],
      travel: {
        disclosure: "提供関係の説明",
        spotIds: [],
        showHotelGuide: true,
      },
    };
    const created = await db.query<{ id: string }>(
      "select public.save_article_with_travel(null,$1::jsonb,null) id",
      [JSON.stringify(article)],
    );
    const aid = created.rows[0].id;
    assert.equal(
      (
        await db.query<{ v: boolean }>(
          "select show_hotel_guide v from public.article_travel_metadata where article_id=$1",
          [aid],
        )
      ).rows[0].v,
      true,
    );
    assert.equal(
      (
        await db.query<{ v: boolean }>(
          "select (snapshot->'travel'->>'showHotelGuide')::boolean v from public.article_revisions where article_id=$1 order by revision_number desc limit 1",
          [aid],
        )
      ).rows[0].v,
      true,
    );
    const { travel: _travel, ...old } = article;
    void _travel;
    await db.query(
      "select public.save_article_with_travel($1,$2::jsonb,null)",
      [aid, JSON.stringify(old)],
    );
    assert.equal(
      (
        await db.query<{ v: boolean }>(
          "select show_hotel_guide v from public.article_travel_metadata where article_id=$1",
          [aid],
        )
      ).rows[0].v,
      true,
    );
    assert.equal(
      (
        await db.query<{ public: boolean }>(
          "select public from storage.buckets where id='hotel-images'",
        )
      ).rows[0].public,
      false,
    );
    console.log(
      "Hotel migration passed: atomic save/rollback, stale edits, fixed URLs, anonymous/authenticated RLS, child privacy, image expiry, validated batched metrics, soft delete/restore, article revisions, private images. No hosted database used.",
    );
  } finally {
    await db.close();
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
