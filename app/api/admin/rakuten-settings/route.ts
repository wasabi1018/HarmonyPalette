import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getAdminAccess } from "@/lib/supabase/auth-server";
import { getRakutenSettingsStatus, resolveRakutenSettings, updateRakutenSettings } from "@/lib/rakuten-settings";
import { testRakutenConnection } from "@/lib/rakuten-api";
import { parseRakutenSettingsPatch, RakutenSettingsError } from "@/lib/rakuten-settings-input";
import { RAKUTEN_PR_PLACEMENTS, RAKUTEN_PR_PRODUCTS_CACHE_TAG } from "@/lib/rakuten-pr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

async function authorize() {
  const access = await getAdminAccess();
  if (access.ok) return null;
  return NextResponse.json({ error: "管理者としてログインしてください。" }, {
    status: access.reason === "unconfigured" ? 503 : access.reason === "forbidden" ? 403 : 401, headers,
  });
}

function errorResponse(error: unknown) {
  return NextResponse.json({ error: error instanceof RakutenSettingsError ? error.message : "楽天API設定を処理できませんでした。時間をおいてお試しください。" }, {
    status: error instanceof RakutenSettingsError ? error.status : 503, headers,
  });
}

async function input(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new RakutenSettingsError("この画面からもう一度操作してください。", 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new RakutenSettingsError("入力内容を確認してください。");
  }
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > 4096) throw new RakutenSettingsError("入力内容が長すぎます。");
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new RakutenSettingsError("入力内容を確認してください。"); }
  return parseRakutenSettingsPatch(value);
}

export async function GET() {
  const denied = await authorize();
  if (denied) return denied;
  try { return NextResponse.json({ settings: await getRakutenSettingsStatus() }, { headers }); }
  catch (error) { return errorResponse(error); }
}

export async function PUT(request: Request) {
  const denied = await authorize();
  if (denied) return denied;
  try {
    const settings = await updateRakutenSettings(await input(request));
    revalidateTag(RAKUTEN_PR_PRODUCTS_CACHE_TAG);
    for (const definition of RAKUTEN_PR_PLACEMENTS) definition.revalidatePaths.forEach((path) => revalidatePath(path));
    revalidatePath("/admin/rakuten-pr");
    return NextResponse.json({ ok: true, settings }, { headers });
  } catch (error) { return errorResponse(error); }
}

// Tests unsaved inputs (or retained saved fields) without modifying storage.
export async function POST(request: Request) {
  const denied = await authorize();
  if (denied) return denied;
  try {
    const result = await testRakutenConnection(await resolveRakutenSettings(await input(request)));
    return NextResponse.json({ ok: true, result }, { headers });
  } catch (error) { return errorResponse(error); }
}
