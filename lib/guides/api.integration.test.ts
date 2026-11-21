import assert from "node:assert/strict";
import { before, beforeEach, mock, test } from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
let access: { ok: boolean; reason?: string } = { ok: false, reason: "unauthorized" };
let writes = 0;
let reads = 0;
let invalidations = 0;
let publicUnavailable = false;
const fixture = { preparing: true, updatedAt: "2026-11-09T00:00:00Z", categories: [], articles: [], events: [], guides: [] };
mock.module("next/cache", { namedExports: { revalidatePath: () => { invalidations++; } } });
mock.module(pathToFileURL(resolve(__dirname, "../supabase/auth-server.ts")), { namedExports: { getAdminAccess: async () => access } });
mock.module(pathToFileURL(resolve(__dirname, "../public-cache.ts")), { namedExports: { revalidatePublicArticleData: () => { invalidations++; } } });
mock.module(pathToFileURL(resolve(__dirname, "repository.ts")), { namedExports: { getGuideManagementData: async () => { reads++; return fixture; }, saveGuideConfiguration: async () => { writes++; }, getPublicGuideCatalog: async () => { if (publicUnavailable) throw new Error("private backend detail"); return { preparing: true, groups: [] }; } } });
let route: typeof import("../../app/api/admin/guides/route");
let publicRoute: typeof import("../../app/api/guides/route");
before(async () => { route = await import(pathToFileURL(resolve(__dirname, "../../app/api/admin/guides/route.ts")).href); publicRoute = await import(pathToFileURL(resolve(__dirname, "../../app/api/guides/route.ts")).href); });
beforeEach(() => { access = { ok: false, reason: "unauthorized" }; writes = 0; reads = 0; invalidations = 0; publicUnavailable = false; });
test("anonymous/non-admin cannot read configuration or disable preparing", async () => {
  assert.equal((await route.GET()).status, 401);
  assert.equal((await route.PUT(new Request("https://example.test", { method: "PUT", body: JSON.stringify(fixture) }))).status, 401);
  access = { ok: false, reason: "forbidden" };
  assert.equal((await route.GET()).status, 403);
  assert.equal(writes + reads + invalidations, 0);
});
test("malformed toggles fail before persistence; valid admin save invalidates the directory", async () => {
  access = { ok: true };
  const request = (body: unknown) => new Request("https://example.test", { method: "PUT", body: JSON.stringify(body) });
  assert.equal((await route.PUT(request({ ...fixture, preparing: "false" }))).status, 400);
  assert.equal(writes, 0);
  assert.equal((await route.PUT(request({ ...fixture, preparing: false }))).status, 200);
  assert.equal(writes, 1);
  assert.equal(reads, 1);
  assert.ok(invalidations >= 2);
});

test("anonymous modal requests are uncached and data failures do not expose backend details", async () => {
  const response = await publicRoute.GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { data: { preparing: true, groups: [] } });
  publicUnavailable = true;
  const failed = await publicRoute.GET();
  assert.equal(failed.status, 503);
  assert.doesNotMatch(await failed.text(), /private backend detail/);
  assert.equal(writes, 0);
});
