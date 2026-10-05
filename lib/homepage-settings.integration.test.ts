import assert from "node:assert/strict";
import { test, mock, before } from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createDefaultHomepageGuideCards } from "./homepage-guide-cards";

const files = new Map<string, string>();
const invalidated: string[] = [];
let access: { ok: boolean; reason?: string; user?: object } = { ok: true, user: { id: "test-admin" } };
let storageFailure = false;
let uploads = 0;
const client = {
  storage: {
    getBucket: async () => ({ data: { id: "site-settings", public: false }, error: null }),
    from: (bucket: string) => ({
      download: async (path: string) => {
        if (storageFailure) return { data: null, error: { message: "Network failure" } };
        const value = files.get(`${bucket}/${path}`);
        return value === undefined ? { data: null, error: { message: "Object not found" } } : { data: new Blob([value]), error: null };
      },
      upload: async (path: string, payload: Buffer, options: { upsert: boolean; contentType: string }) => {
        if (storageFailure) return { error: { message: "Network failure" } };
        assert.equal(options.upsert, true);
        assert.equal(options.contentType, "application/json");
        files.set(`${bucket}/${path}`, payload.toString("utf8")); uploads += 1;
        return { error: null };
      },
    }),
  },
};

mock.module("server-only", { defaultExport: {} });
mock.module(pathToFileURL(resolve(__dirname, "supabase/server.ts")), { namedExports: {
  getSupabaseAdminClient: () => client,
  getSupabaseReadClient: () => client,
} });
mock.module(pathToFileURL(resolve(__dirname, "supabase/auth-server.ts")), { namedExports: { getAdminAccess: async () => access } });
mock.module("next/cache", { namedExports: { revalidatePath: (path: string) => invalidated.push(path) } });

let route: typeof import("../app/api/admin/homepage-settings/route");
let repository: typeof import("./homepage-settings");
before(async () => {
  route = await import(pathToFileURL(resolve(__dirname, "../app/api/admin/homepage-settings/route.ts")).href);
  repository = await import(pathToFileURL(resolve(__dirname, "homepage-settings.ts")).href);
});

test("admin settings save persists all fields and invalidates the public homepage", async () => {
  const cards = createDefaultHomepageGuideCards();
  cards[0] = { title: "編集後の見出し", url: "/articles/edited-guide", description: "編集後の説明文" };
  const response = await route.PUT(new Request("https://example.test/api/admin/homepage-settings", {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guideCards: cards }),
  }));
  assert.equal(response.status, 200);
  assert.deepEqual((await repository.getHomepageSettings()).guideCards, cards);
  assert.deepEqual((await (await route.GET()).json()).settings.guideCards, cards);
  assert.deepEqual(invalidated, ["/", "/admin/homepage"]);
  assert.equal(uploads, 1);
});

test("signed-out and non-admin users cannot read or overwrite settings", async () => {
  for (const [reason, status] of [["signed-out", 401], ["forbidden", 403]] as const) {
    access = { ok: false, reason };
    assert.equal((await route.GET()).status, status);
    assert.equal((await route.PUT(new Request("https://example.test", { method: "PUT", body: "{}" }))).status, status);
  }
  assert.equal(uploads, 1);
  access = { ok: true, user: { id: "test-admin" } };
});

test("invalid links and storage failures do not overwrite previously saved settings", async () => {
  const before = new Map(files);
  const cards = createDefaultHomepageGuideCards(); cards[1].url = "javascript:alert(1)";
  const response = await route.PUT(new Request("https://example.test", { method: "PUT", body: JSON.stringify({ guideCards: cards }) }));
  assert.equal(response.status, 400);
  assert.deepEqual(files, before);
  storageFailure = true;
  assert.equal((await route.GET()).status, 503);
  assert.equal((await route.PUT(new Request("https://example.test", { method: "PUT", body: JSON.stringify({ guideCards: createDefaultHomepageGuideCards() }) }))).status, 503);
  assert.deepEqual(files, before);
  storageFailure = false;
});
