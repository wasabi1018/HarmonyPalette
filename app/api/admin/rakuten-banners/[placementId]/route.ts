import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/supabase/auth-server";
import { getRakutenBannerDefinition, parseRakutenBanner } from "@/lib/rakuten-banner";
import { getRakutenBanner, updateRakutenBanner } from "@/lib/rakuten-banner-settings";
import { RakutenSettingsError } from "@/lib/rakuten-settings-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
type Context = { params: Promise<{ placementId: string }> };

async function authorize() {
  const access = await getAdminAccess();
  return access.ok ? null : NextResponse.json({ error: "管理者としてログインしてください。" }, {
    status: access.reason === "unconfigured" ? 503 : access.reason === "forbidden" ? 403 : 401, headers,
  });
}
function errorResponse(error: unknown) {
  return NextResponse.json({ error: error instanceof RakutenSettingsError ? error.message : "バナーの掲載内容を処理できませんでした。時間をおいてお試しください。" }, {
    status: error instanceof RakutenSettingsError ? error.status : 503, headers,
  });
}
export async function GET(_request: Request, context: Context) {
  const denied = await authorize();
  if (denied) return denied;
  try { return NextResponse.json({ banner: await getRakutenBanner(getRakutenBannerDefinition((await context.params).placementId)) }, { headers }); }
  catch (error) { return errorResponse(error); }
}
export async function PUT(request: Request, context: Context) {
  const denied = await authorize();
  if (denied) return denied;
  try {
    const definition = getRakutenBannerDefinition((await context.params).placementId);
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) throw new RakutenSettingsError("この画面からもう一度操作してください。", 403);
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new RakutenSettingsError("バナーの掲載内容を確認してください。");
    const payload = await request.text();
    if (Buffer.byteLength(payload, "utf8") > 16384) throw new RakutenSettingsError("バナーの掲載内容が長すぎます。");
    let input: unknown;
    try { input = JSON.parse(payload); } catch { throw new RakutenSettingsError("バナーの掲載内容を確認してください。"); }
    const banner = await updateRakutenBanner(definition, parseRakutenBanner(input, definition));
    definition.revalidatePaths.forEach((path) => revalidatePath(path));
    revalidatePath("/admin/rakuten-pr");
    return NextResponse.json({ ok: true, banner }, { headers });
  } catch (error) { return errorResponse(error); }
}
