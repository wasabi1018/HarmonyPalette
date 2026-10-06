import assert from "node:assert/strict";
import { before, beforeEach, after, mock, test } from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseRakutenSettingsPatch } from "./rakuten-settings-input";

// All credentials and services in this suite are fictional and isolated.
const credentials = { applicationId: "fixture-app", accessKey: "fixture-key+/=", affiliateId: "fixture.affiliate" };
const objectPath = "integration-secrets/rakuten.json";
const files = new Map<string, string>();
let access: { ok: boolean; reason?: string; user?: object };
let bucket: { public: boolean } | null;
let storageFailure = false;
let uploadFailure = false;
let configured = true;
let uploads = 0;
let apiCalls = 0;
let apiFailure: number | "network" | "malformed" | null = null;
let wrappedItems = false;
const originalFetch = globalThis.fetch;
const client = { storage: {
  getBucket: async () => storageFailure
    ? { data: null, error: { message: `Network failure ${credentials.accessKey}` } }
    : { data: bucket, error: bucket ? null : { message: "Bucket not found" } },
  createBucket: async (name: string, options: { public: boolean }) => {
    assert.equal(name, "integration-secrets"); assert.equal(options.public, false);
    bucket = { public: false }; return { error: null };
  },
  from: (name: string) => ({
    download: async (path: string) => {
      const value = files.get(`${name}/${path}`);
      return value === undefined ? { data: null, error: { message: "Object not found" } } : { data: new Blob([value]), error: null };
    },
    upload: async (path: string, payload: Buffer, options: { upsert: boolean; contentType: string; cacheControl: string }) => {
      assert.equal(options.upsert, true); assert.equal(options.contentType, "application/json"); assert.equal(options.cacheControl, "0");
      if (uploadFailure) return { error: { message: `Upload failed ${credentials.accessKey}` } };
      files.set(`${name}/${path}`, payload.toString("utf8")); uploads++;
      return { error: null };
    },
  }),
} };

mock.module("server-only", { defaultExport: {} });
mock.module("next/cache", { namedExports: { revalidatePath: () => undefined, revalidateTag: () => undefined } });
mock.module(pathToFileURL(resolve(__dirname, "supabase/server.ts")), { namedExports: { getSupabaseAdminClient: () => configured ? client : null } });
mock.module(pathToFileURL(resolve(__dirname, "supabase/auth-server.ts")), { namedExports: { getAdminAccess: async () => access } });
mock.module(pathToFileURL(resolve(__dirname, "site-config.ts")), { namedExports: { SITE_URL: "https://example.test" } });
let route: typeof import("../app/api/admin/rakuten-settings/route");
before(async () => { route = await import(pathToFileURL(resolve(__dirname, "../app/api/admin/rakuten-settings/route.ts")).href); });
beforeEach(() => {
  files.clear(); bucket = { public: false }; storageFailure = false; uploadFailure = false; configured = true; uploads = 0; apiCalls = 0;
  apiFailure = null; wrappedItems = false; access = { ok: true, user: { id: "fixture-admin" } };
  globalThis.fetch = async (input, init) => {
    apiCalls++;
    const url = new URL(String(input));
    assert.equal(url.origin, "https://openapi.rakuten.co.jp");
    assert.equal(url.pathname, "/ichibams/api/IchibaItem/Search/20260701");
    assert.equal(url.searchParams.get("applicationId"), credentials.applicationId);
    assert.equal(url.searchParams.has("accessKey"), false);
    assert.equal(new Headers(init?.headers).get("accessKey"), credentials.accessKey);
    assert.equal(new Headers(init?.headers).get("Origin"), "https://example.test");
    assert.equal(init?.cache, "no-store"); assert.equal(init?.redirect, "error");
    if (apiFailure === "network") throw new Error(`fetch failed ${url} ${credentials.accessKey}`);
    if (apiFailure === "malformed") return Response.json({ echo: credentials });
    if (apiFailure) return Response.json({ error: credentials.accessKey }, { status: apiFailure });
    const products = [{ itemName: "接続確認用タオル", affiliateUrl: "https://hb.afl.rakuten.co.jp/fixture" }];
    return Response.json(wrappedItems ? { Items: products.map((Item) => ({ Item })) } : { items: products });
  };
});
after(() => { globalThis.fetch = originalFetch; });

function request(method: string, value: unknown, headers: Record<string, string> = {}) {
  return new Request("https://example.test/api/admin/rakuten-settings", { method, headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(value) });
}
function saved(value: object = credentials) { files.set(objectPath, JSON.stringify({ ...value, updatedAt: "2026-10-06T00:00:00Z" })); }
async function safeBody(response: Response) {
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const body = await response.text();
  for (const value of Object.values(credentials)) assert.equal(body.includes(value), false, "response must not expose credentials");
  return JSON.parse(body);
}

test("first save creates a private bucket and returns only presence flags", async () => {
  bucket = null;
  const response = await route.PUT(request("PUT", credentials));
  assert.equal(response.status, 200);
  assert.equal((await safeBody(response)).settings.configured, true);
  assert.equal((bucket as { public: boolean } | null)?.public, false); assert.equal(uploads, 1);
  assert.deepEqual(JSON.parse(files.get(objectPath)!).accessKey, credentials.accessKey);
  const get = await safeBody(await route.GET());
  assert.deepEqual(Object.keys(get.settings).sort(), ["configured", "hasAccessKey", "hasAffiliateId", "hasApplicationId", "updatedAt"].sort());
});

test("blank fields retain saved values and affiliate ID can be added separately", async () => {
  saved({ ...credentials, affiliateId: "" });
  const response = await route.PUT(request("PUT", { applicationId: " ", accessKey: "", affiliateId: credentials.affiliateId }));
  assert.equal(response.status, 200); assert.equal((await safeBody(response)).settings.hasAffiliateId, true);
  const stored = JSON.parse(files.get(objectPath)!);
  for (const [field, value] of Object.entries(credentials)) assert.equal(stored[field], value);
});

test("connection check uses entered credentials without saving and verifies affiliate URLs", async () => {
  const response = await route.POST(request("POST", credentials));
  assert.equal(response.status, 200);
  const body = await safeBody(response);
  assert.equal(body.result.itemCount, 1); assert.equal(body.result.affiliateReady, true);
  assert.deepEqual(body.result.itemNames, ["接続確認用タオル"]);
  assert.equal(uploads, 0); assert.equal(files.size, 0); assert.equal(apiCalls, 1);
});

test("connection check retains saved fields and supports wrapped API responses", async () => {
  saved(); wrappedItems = true;
  const response = await route.POST(request("POST", {}));
  assert.equal(response.status, 200); assert.equal((await safeBody(response)).result.affiliateReady, true);
  assert.equal(uploads, 0);
});

test("unconfigured, signed-out and non-admin users cannot read, test or save", async () => {
  for (const [reason, status] of [["unconfigured", 503], ["signed-out", 401], ["forbidden", 403]] as const) {
    access = { ok: false, reason };
    assert.equal((await route.GET()).status, status);
    assert.equal((await route.PUT(request("PUT", credentials))).status, status);
    assert.equal((await route.POST(request("POST", credentials))).status, status);
  }
  assert.equal(uploads, 0); assert.equal(apiCalls, 0);
});

test("invalid credential input, mismatched app pairs and cross-origin mutations are rejected", async () => {
  saved(); const snapshot = new Map(files);
  for (const value of [{ accessKey: "bad\nkey" }, { applicationId: "new-app" }, { accessKey: 12 }, { accessKey: "x".repeat(513) }, null]) {
    assert.equal((await route.PUT(request("PUT", value))).status, 400);
  }
  assert.equal((await route.POST(request("POST", credentials, { Origin: "https://other.test" }))).status, 403);
  assert.equal((await route.PUT(request("PUT", credentials, { "Content-Type": "text/plain" }))).status, 400);
  assert.deepEqual(files, snapshot); assert.equal(uploads, 0); assert.equal(apiCalls, 0);
  assert.deepEqual(parseRakutenSettingsPatch({ accessKey: ` ${credentials.accessKey} `, ignored: "ignored" }), { accessKey: credentials.accessKey });
});

test("public storage is refused for reads, connection tests and writes", async () => {
  saved(); bucket = { public: true };
  assert.equal((await route.GET()).status, 503);
  assert.equal((await route.PUT(request("PUT", credentials))).status, 503);
  assert.equal((await route.POST(request("POST", credentials))).status, 503);
  assert.equal(uploads, 0); assert.equal(apiCalls, 0);
});

test("corrupt settings are not silently overwritten", async () => {
  files.set(objectPath, "{ broken");
  assert.equal((await route.GET()).status, 503);
  assert.equal((await route.PUT(request("PUT", credentials))).status, 503);
  assert.equal(files.get(objectPath), "{ broken"); assert.equal(uploads, 0);
});

test("invalid saved timestamps do not break rendering", async () => {
  files.set(objectPath, JSON.stringify({ ...credentials, updatedAt: "invalid-date" }));
  const response = await route.GET();
  assert.equal(response.status, 200); assert.equal((await safeBody(response)).settings.updatedAt, null);
});

test("storage errors and missing server credentials produce safe errors without writes", async () => {
  for (const failure of ["storage", "configuration"]) {
    storageFailure = failure === "storage"; configured = failure !== "configuration";
    const response = await route.PUT(request("PUT", credentials));
    assert.equal(response.status, 503); await safeBody(response);
  }
  assert.equal(uploads, 0);
});

test("provider and transport errors redact credentials and leave settings unchanged", async () => {
  saved(); const snapshot = new Map(files);
  for (const failure of [400, 401, 403, 429, 500, "network", "malformed"] as const) {
    apiFailure = failure;
    const response = await route.POST(request("POST", {}));
    assert.equal(response.status, 502); await safeBody(response);
  }
  assert.deepEqual(files, snapshot); assert.equal(uploads, 0);
});

test("an upload failure does not report success or replace saved credentials", async () => {
  saved(); const snapshot = new Map(files); uploadFailure = true;
  const response = await route.PUT(request("PUT", { accessKey: "fixture-replacement" }));
  assert.equal(response.status, 503); await safeBody(response);
  assert.deepEqual(files, snapshot); assert.equal(uploads, 0);
});
