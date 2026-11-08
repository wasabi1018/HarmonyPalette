import assert from "node:assert/strict";
import { test } from "node:test";
import { guideEventFor, groupGuideArticles, parseGuideAssignment, parseGuideConfiguration } from "./model";

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
