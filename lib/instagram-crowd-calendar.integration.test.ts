import assert from "node:assert/strict";
import { before, beforeEach, mock, test } from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { emptyCrowdSettings } from "./crowd-calendar";

const files = new Map<string, string>();
let authorized = true;
let uploads = 0;
let failedUpload = false;
let unavailableFacts = false;
const client = { storage: {
  getBucket: async () => ({ data: { public: false }, error: null }),
  from: () => ({
    download: async (path: string) => files.has(path) ? { data: new Blob([files.get(path)!]), error: null } : { data: null, error: { statusCode: 404, message: "Not found" } },
    upload: async (path: string, body: Buffer, options: { upsert: boolean }) => {
      assert.equal(options.upsert, true);
      if (failedUpload) return { error: { message: "Upload failed" } };
      uploads++; files.set(path, body.toString("utf8")); return { error: null };
    },
  }),
} };
mock.module("server-only", { defaultExport: {} });
mock.module(pathToFileURL(resolve(__dirname, "supabase/server.ts")), { namedExports: {
  getSupabaseAdminClient: () => client,
  assertImportAuthorization: async () => authorized ? { ok: true } : { ok: false, message: "認証してください", status: 401 },
} });
mock.module(pathToFileURL(resolve(__dirname, "supabase/schedule-repository.ts")), { namedExports: {
  getPublishedParkOperatingDays: async () => unavailableFacts ? null : [
    { operation_date: "2026-08-01", operating_status: "open", closing_time: "17:30:00" },
    { operation_date: "2026-08-02", operating_status: "closed", closing_time: null },
  ],
  getPublishedSchedules: async () => [101, 102, 103].map((room) => ({ event_date: "2026-08-01", kind: "greeting", source_id: "harmonyland-funstudio", schedule_type: "", location: `ファンスタジオ${room}号室`, verification_status: "verified" })),
} });
mock.module(pathToFileURL(resolve(__dirname, "supabase/character-repository.ts")), { namedExports: {
  getRegisteredCharacters: async () => [{ id: "fixture", name: "テストキャラ", birthdayMonth: 8, birthdayDay: 1 }],
} });
let route: typeof import("../app/api/admin/instagram-crowd-calendar/route");
let settingsRoute: typeof import("../app/api/admin/instagram-crowd-calendar/settings/route");
before(async () => {
  route = await import(pathToFileURL(resolve(__dirname, "../app/api/admin/instagram-crowd-calendar/route.ts")).href);
  settingsRoute = await import(pathToFileURL(resolve(__dirname, "../app/api/admin/instagram-crowd-calendar/settings/route.ts")).href);
});
beforeEach(() => { files.clear(); authorized = true; uploads = 0; failedUpload = false; unavailableFacts = false; });
const prefix = "instagram/crowd-calendar";
const get = (month = "2026-08") => route.GET(new Request(`https://example.test/api?month=${month}`));
const put = (value: unknown) => new Request("https://example.test/api", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });

test("旧下書きを保持して、新しい表示情報と自動判定を読み込む。GETは保存しない", async () => {
  files.set(`${prefix}/2026-08.json`, JSON.stringify({ version: 1, month: "2026-08", overrides: { "2026-08-01": "busy" } }));
  const response = await get(); assert.equal(response.status, 200);
  const data = await response.json();
  assert.deepEqual(data.draft.annotations, {}); assert.equal(data.draft.overrides["2026-08-01"], "busy");
  assert.deepEqual(data.closedDates, ["2026-08-02"]);
  assert.deepEqual(data.facts["2026-08-01"].rooms, [101, 102, 103]);
  assert.equal(data.facts["2026-08-01"].night, true);
  assert.deepEqual(data.facts["2026-08-01"].birthdays, ["テストキャラ"]);
  assert.equal(data.settings.labels.fanStudio, "ファンスタ3部屋"); assert.equal(uploads, 0);
});

test("月別表示情報と共通イベント・表示文言を保存し、別月でも共通設定を読み込む", async () => {
  const settings = emptyCrowdSettings(); settings.labels.night = "夜まで営業";
  settings.events = [{ id: "summer", name: "夏イベント", startDate: "2026-08-01", endDate: "2026-09-01" }];
  assert.equal((await settingsRoute.PUT(put(settings))).status, 200);
  assert.equal((await route.PUT(put({ month: "2026-08", overrides: {}, annotations: { "2026-08-02": { note: "休園日の誕生日", fanStudio: "hide" } } }))).status, 200);
  const august = await (await get()).json();
  assert.equal(august.draft.annotations["2026-08-02"].note, "休園日の誕生日");
  const september = await (await get("2026-09")).json();
  assert.equal(september.settings.labels.night, "夜まで営業"); assert.deepEqual(september.settings.events, settings.events);
  assert.deepEqual(september.draft.annotations, {}); assert.equal(uploads, 2);
});

test("管理者認証と入力検証で、不正な読み取り・書き込みを拒否する", async () => {
  authorized = false;
  assert.equal((await get()).status, 401);
  assert.equal((await route.PUT(put({ month: "2026-08", overrides: {} }))).status, 401);
  assert.equal((await settingsRoute.PUT(put(emptyCrowdSettings()))).status, 401);
  authorized = true;
  assert.equal((await route.PUT(put({ month: "2026-08", overrides: {}, annotations: { "2026-09-01": { note: "月外" } } }))).status, 400);
  assert.equal((await settingsRoute.PUT(put({ ...emptyCrowdSettings(), events: [{ id: "bad", name: "夏", startDate: "2026-09-01", endDate: "2026-08-01" }] }))).status, 400);
  assert.equal(uploads, 0);
});

test("営業情報未取得と保存失敗では成功を返さず、保存内容を変更しない", async () => {
  unavailableFacts = true; assert.equal((await get()).status, 500);
  failedUpload = true;
  assert.equal((await route.PUT(put({ month: "2026-08", overrides: {}, annotations: {} }))).status, 500);
  assert.equal((await settingsRoute.PUT(put(emptyCrowdSettings()))).status, 500);
  assert.equal(uploads, 0); assert.equal(files.size, 0);
});
