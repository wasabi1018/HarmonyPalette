import assert from "node:assert/strict";
import { test } from "node:test";
import { guideEventFor, guidePreviewCatalog, groupGuideArticles, parseGuideAssignment, parseGuideConfiguration } from "./model";
import { createStarterGuideDraft, starterGuideOptions } from "./starter-drafts";

const category = "11111111-1111-4111-8111-111111111111";
test("Fan Studio rooms/characters share one guide; distinct imported shows remain separate", () => {
  const base = { sourceId: "harmonyland-funstudio", scheduleType: "グリーティング", kind: "greeting", location: "101号室", title: "クロミ" };
  assert.deepEqual(guideEventFor(base), guideEventFor({ ...base, title: "ポムポムプリン", location: "102号室" }));
  const show = { ...base, sourceId: "harmonyland", kind: "event", title: "Ａ ショー" };
  assert.equal(guideEventFor(show)?.key, guideEventFor({ ...show, title: "A　ショー" })?.key);
  assert.notEqual(guideEventFor(show)?.key, guideEventFor({ ...show, title: "別のショー" })?.key);
  assert.equal(guideEventFor({ ...show, sourceId: "" }), null);
});
test("free-title guides need no event; event assignment and category inputs are strict", () => {
  assert.deepEqual(parseGuideAssignment({ eventKey: null, categoryId: category, displayOrder: 0 }), { eventKey: null, categoryId: category, displayOrder: 0 });
  assert.throws(() => parseGuideAssignment({ eventKey: "", categoryId: null, displayOrder: 0 }));
  assert.throws(() => parseGuideAssignment({ eventKey: null, categoryId: "bad", displayOrder: 0 }));
  assert.throws(() => parseGuideAssignment({ eventKey: null, categoryId: null, displayOrder: -1 }));
});
test("preparing defaults cannot be disabled by malformed input; sorting rejects stale shape and dangling categories", () => {
  const config = { preparing: false, updatedAt: "2026-11-09T00:00:00Z", categories: [{ id: category, name: "園内", displayOrder: 0 }], articles: [] };
  assert.equal(parseGuideConfiguration(config).preparing, false);
  assert.throws(() => parseGuideConfiguration({ ...config, preparing: "false" }));
  assert.throws(() => parseGuideConfiguration({ ...config, categories: [...config.categories, ...config.categories] }));
  assert.throws(() => parseGuideConfiguration({ ...config, articles: [{ id: category, categoryId: "22222222-2222-4222-8222-222222222222", displayOrder: 0 }] }));
});
test("owner category/order wins over title or publication order, including uncategorized free guides", () => {
  const article = { id: "a", title: "アトラクション", slug: "a", excerpt: "", status: "published" as const, eventKey: null, categoryId: category, displayOrder: 2 };
  const groups = groupGuideArticles([{ id: category, name: "園内", displayOrder: 0 }], [article, { ...article, id: "b", title: "レストラン", displayOrder: 1 }, { ...article, id: "c", categoryId: null }]);
  assert.deepEqual(groups[0].articles.map((item) => item.id), ["b", "a"]);
  assert.equal(groups[1].articles[0].id, "c");
});

test("admin preview uses unsaved category and order edits without changing preparing or article status", () => {
  const data = { preparing: true, updatedAt: "2026-11-21T00:00:00Z", categories: [{ id: category, name: "変更中のカテゴリ", displayOrder: 0 }], events: [], guides: [{ id: "a", title: "A", slug: "a", excerpt: "", contentHtml: "<p>本文</p>", status: "draft" as const, eventKey: null, categoryId: null, displayOrder: 0 }, { id: "b", title: "B", slug: "b", excerpt: "", status: "published" as const, eventKey: null, categoryId: category, displayOrder: 1 }], articles: [{ id: "a", categoryId: category, displayOrder: 2 }, { id: "b", categoryId: category, displayOrder: 0 }] };
  const result = guidePreviewCatalog(data);
  assert.equal(result.groups[0].name, "変更中のカテゴリ");
  assert.deepEqual(result.groups[0].guides.map((guide) => guide.id), ["b", "a"]);
  assert.equal(data.preparing, true);
  assert.equal(data.guides[0].status, "draft");
});

test("all four supplied manuscripts load as editable unpublished drafts, only Fan Studio needs an imported event", () => {
  assert.equal(starterGuideOptions.length, 4);
  for (const option of starterGuideOptions) {
    const draft = createStarterGuideDraft(option.id)!;
    assert.equal(draft.status, "draft");
    assert.equal(draft.publishedAt, null);
    assert.equal(draft.guide?.eventKey, option.id === "fan-studio" ? "harmonyland-funstudio" : null);
    assert.equal(draft.contentJson.type, "doc");
    assert.match(draft.contentHtml, /<h2>/);
    assert.ok(draft.contentHtml.length > 100);
  }
  assert.equal(createStarterGuideDraft("unknown"), null);
});
