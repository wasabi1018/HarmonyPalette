import assert from "node:assert/strict";
import { before, beforeEach, mock, test } from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

type Row = Record<string, unknown>;
let tables: Record<string, Row[]>;
let reads: string[];
let writes: string[];
let configured = true;
let failArticles = false;

class Query implements PromiseLike<{ data: Row[] | Row | null; error: null | { message: string } }> {
  filters: ((row: Row) => boolean)[] = [];
  orders: string[] = [];
  start = 0;
  end = Infinity;
  one = false;
  operation = "read";
  value: Row | Row[] = {};
  constructor(readonly table: string) {}
  select() { return this; }
  eq(key: string, value: unknown) { this.filters.push((row) => row[key] === value); return this; }
  is(key: string, value: unknown) { this.filters.push((row) => (row[key] ?? null) === value); return this; }
  not(key: string, _operator: string, value: unknown) { this.filters.push((row) => (row[key] ?? null) !== value); return this; }
  lte(key: string, value: string) { this.filters.push((row) => row[key] != null && String(row[key]) <= value); return this; }
  order(key: string) { this.orders.push(key); return this; }
  range(start: number, end: number) { this.start = start; this.end = end; return this; }
  limit(count: number) { this.end = count - 1; return this; }
  maybeSingle() { this.one = true; return this; }
  single() { this.one = true; return this; }
  update(value: Row) { this.operation = "update"; this.value = value; return this; }
  insert(value: Row | Row[]) { this.operation = "insert"; this.value = value; return this; }
  delete() { this.operation = "delete"; return this; }
  then<TResult1 = { data: Row[] | Row | null; error: null | { message: string } }, TResult2 = never>(
    fulfilled?: ((value: { data: Row[] | Row | null; error: null | { message: string } }) => TResult1 | PromiseLike<TResult1>) | null,
    rejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    reads.push(this.table);
    if (this.table === "articles" && failArticles) return Promise.resolve({ data: null, error: { message: "unavailable" } }).then(fulfilled, rejected);
    let rows = (tables[this.table] ?? []).filter((row) => this.filters.every((filter) => filter(row)));
    if (this.operation !== "read") {
      writes.push(this.table);
      if (this.operation === "update") rows.forEach((row) => Object.assign(row, this.value));
      if (this.operation === "delete") tables[this.table] = (tables[this.table] ?? []).filter((row) => !rows.includes(row));
      if (this.operation === "insert") { rows = (Array.isArray(this.value) ? this.value : [this.value]).map((row) => ({ id: crypto.randomUUID(), ...row })); (tables[this.table] ??= []).push(...rows); }
    }
    rows = [...rows].sort((a, b) => { for (const key of this.orders) { const comparison = String(a[key]).localeCompare(String(b[key])); if (comparison) return comparison; } return 0; }).slice(this.start, this.end + 1);
    return Promise.resolve({ data: this.one ? rows[0] ?? null : rows, error: null }).then(fulfilled, rejected);
  }
}

const client = { from: (table: string) => new Query(table), rpc: async () => ({ data: null, error: { code: "PGRST202", message: "not installed" } }) };
const moduleUrl = (file: string) => pathToFileURL(resolve(__dirname, file));
mock.module("server-only", { defaultExport: {} });
mock.module(moduleUrl("../supabase/server.ts"), { namedExports: { getSupabaseAdminClient: () => configured ? client : null, getSupabaseReadClient: () => configured ? client : null } });

let guides: typeof import("./repository");
let articles: typeof import("../articles/repository");
before(async () => {
  guides = await import(moduleUrl("repository.ts").href);
  articles = await import(moduleUrl("../articles/repository.ts").href);
});
beforeEach(() => {
  configured = true; failArticles = false; reads = []; writes = [];
  tables = { guide_settings: [{ id: true, preparing: false, updated_at: "2026-11-21T00:00:00Z" }], guide_categories: [{ id: "22222222-2222-4222-8222-222222222222", name: "園内", display_order: 0 }], articles: [], article_tags: [], article_revisions: [], schedule_items: [] };
});

const row = (id: string, overrides: Row = {}): Row => ({ id, title: id, slug: id, excerpt: "説明", content_html: "<h2>案内</h2><p>本文</p>", content_json: { type: "doc", content: [{ type: "paragraph" }] }, status: "published", published_at: "2026-01-01T00:00:00Z", deleted_at: null, destination: "articles", is_strategy_guide: true, guide_event_key: null, guide_category_id: "22222222-2222-4222-8222-222222222222", guide_display_order: 0, ...overrides });

test("preparing and missing configuration never return article bodies", async () => {
  tables.guide_settings[0].preparing = true;
  assert.deepEqual(await guides.getPublicGuideCatalog(), { preparing: true, groups: [] });
  assert.ok(!reads.includes("articles"));
  configured = false;
  assert.deepEqual(await guides.getPublicGuideCatalog(), { preparing: true, groups: [] });
});

test("public modal excludes drafts, future publications, trash and ordinary articles; sanitizes rich text", async () => {
  tables.articles = [row("draft", { status: "draft" }), row("scheduled", { status: "scheduled" }), row("future", { published_at: "2099-01-01T00:00:00Z" }), row("trash", { deleted_at: "2026-01-02" }), row("normal", { is_strategy_guide: false }), row("undated", { published_at: null }), row("visible", { content_html: '<p>安全な本文</p><script>alert(1)</script><img src="https://example.test/a.jpg" onerror="alert(1)"><a href="javascript:alert(1)">リンク</a>' })];
  const result = await guides.getPublicGuideCatalog();
  assert.deepEqual(result.groups.flatMap((group) => group.guides.map((guide) => guide.id)), ["visible"]);
  assert.equal(result.groups[0].guides[0].articleUrl, "/articles/visible");
  const html = result.groups[0].guides[0].contentHtml!;
  assert.match(html, /安全な本文/);
  assert.doesNotMatch(html, /<script|onerror|javascript:/i);
  assert.deepEqual(writes, []);
});

test("all guide bodies are paginated beyond 1000 rows and backend errors remain errors", async () => {
  tables.articles = Array.from({ length: 1001 }, (_, index) => row(`guide-${String(index).padStart(4, "0")}`));
  assert.equal((await guides.getPublicGuideCatalog()).groups[0].guides.length, 1001);
  failArticles = true;
  await assert.rejects(guides.getPublicGuideCatalog(), /読み込めません/);
});

test("body edits preserve event identity and manager order, including legacy requests and revision restoration", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  tables.articles = [row(id, { status: "draft", guide_event_key: "harmonyland-funstudio", guide_display_order: 17 })];
  const input = { title: "本文の更新", slug: "fan", excerpt: "", seoTitle: "", seoDescription: "", contentJson: { type: "doc", content: [{ type: "paragraph" }] }, contentHtml: "<p>更新</p>", coverImageUrl: "", status: "draft" as const, destination: "articles" as const, publishedAt: null, tagIds: [], seriesId: null, seriesOrder: null };
  await articles.updateArticle(id, input, null);
  assert.equal(tables.articles[0].guide_display_order, 17);
  assert.equal(tables.articles[0].guide_event_key, "harmonyland-funstudio");
  assert.equal(tables.articles[0].title, "本文の更新");
  await assert.rejects(articles.updateArticle(id, { ...input, guide: null }, null), /対象イベントは変更できません/);
  await assert.rejects(articles.duplicateArticle(id, null), /作成済み/);
  const revision = tables.article_revisions[0];
  await articles.restoreArticleRevision(id, String(revision.id), null);
  assert.equal(tables.articles[0].guide_display_order, 17);
  assert.equal(tables.articles[0].status, "draft");
});
