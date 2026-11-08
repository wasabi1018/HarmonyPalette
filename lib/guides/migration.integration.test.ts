import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("actual guide migration: publication, access control, uniqueness, atomic reorder and concurrency", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create table articles(id uuid primary key default gen_random_uuid(), title text not null default '', slug text unique, excerpt text default '', content_html text default '', status text default 'draft', published_at timestamptz, deleted_at timestamptz, destination text default 'articles');
      create table tags(id uuid primary key default gen_random_uuid(), slug text);
      create table article_tags(article_id uuid references articles, tag_id uuid references tags);
      alter table articles enable row level security;
      create policy published on articles for select to anon, authenticated using(status='published' and deleted_at is null and published_at <= now());
      grant select on articles, tags, article_tags to anon, authenticated; grant all on articles to service_role;`);
    await db.exec(await readFile(new URL("../../supabase/migrations/20261108230912_strategy_guides.sql", import.meta.url), "utf8"));
    assert.equal((await db.query<{ preparing: boolean }>("select preparing from guide_settings")).rows[0].preparing, true);
    await db.exec("set role anon");
    assert.equal((await db.query("select * from guide_settings")).rows.length, 1);
    await assert.rejects(db.exec("update guide_settings set preparing=false"), /permission denied/);
    await assert.rejects(db.exec("select save_guide_configuration('{}')"), /permission denied/);
    await db.exec("reset role");
    const first = (await db.query<{ id: string }>("insert into articles(title,slug,is_strategy_guide,guide_event_key) values('ファンスタジオ','fan',true,'fan') returning id")).rows[0].id;
    await assert.rejects(db.exec("insert into articles(slug,is_strategy_guide,guide_event_key,status) values('fan-duplicate',true,'fan','scheduled')"), /articles_guide_event_unique/);
    await db.exec("update articles set deleted_at=now() where slug='fan'");
    await db.exec("insert into articles(slug,is_strategy_guide,guide_event_key) values('fan-new',true,'fan')");
    await assert.rejects(db.exec("update articles set deleted_at=null where slug='fan'"), /articles_guide_event_unique/);
    await db.exec("delete from articles where slug='fan-new'; update articles set deleted_at=null, status='published', published_at=now() where slug='fan';");
    await db.exec("insert into articles(title,slug,is_strategy_guide,status,published_at) values('レストラン','restaurant',true,'draft',null),('アトラクション','attraction',true,'published',now()),('通常記事','normal',false,'published',now())");
    const category = "11111111-1111-4111-8111-111111111111";
    const updatedAt = (await db.query<{ value: string }>("select updated_at::text as value from guide_settings")).rows[0].value;
    const config = { preparing: false, updatedAt, categories: [{ id: category, name: "園内", displayOrder: 0 }], articles: [{ id: first, categoryId: category, displayOrder: 4 }] };
    await db.query("select save_guide_configuration($1)", [config]);
    assert.equal((await db.query<{ preparing: boolean }>("select preparing from guide_settings")).rows[0].preparing, false);
    assert.equal((await db.query<{ guide_display_order: number }>("select guide_display_order from articles where id=$1", [first])).rows[0].guide_display_order, 4);
    await assert.rejects(db.query("select save_guide_configuration($1)", [config]), /guide_configuration_stale/);
    const nextVersion = (await db.query<{ updated_at: Date }>("select updated_at from guide_settings")).rows[0].updated_at.toISOString();
    // PostgreSQL timestamps have microseconds; query the unrounded text for exact optimistic locking.
    const exactVersion = (await db.query<{ value: string }>("select updated_at::text as value from guide_settings")).rows[0].value;
    assert.ok(nextVersion);
    await assert.rejects(db.query("select save_guide_configuration($1)", [{ ...config, updatedAt: exactVersion, preparing: true, articles: [{ id: first, categoryId: "22222222-2222-4222-8222-222222222222", displayOrder: 0 }] }]), /foreign key/);
    assert.equal((await db.query<{ preparing: boolean }>("select preparing from guide_settings")).rows[0].preparing, false);
    await db.query("select save_guide_configuration($1)", [{ preparing: true, updatedAt: exactVersion, categories: [], articles: [] }]);
    assert.equal((await db.query<{ guide_category_id: null }>("select guide_category_id from articles where id=$1", [first])).rows[0].guide_category_id, null);
    await db.exec("set role anon");
    const publicArticles = (await db.query<{ slug: string }>("select slug from articles where is_strategy_guide order by slug")).rows.map((item) => item.slug);
    assert.deepEqual(publicArticles, ["attraction", "fan"]);
    const normalSearch = await db.query<{ article_id: string }>("select * from search_published_articles() ");
    assert.equal(normalSearch.rows.length, 1);
    await db.exec("reset role");
  } finally { await db.close(); }
});
