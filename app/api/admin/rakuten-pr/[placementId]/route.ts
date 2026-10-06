import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/supabase/auth-server";
import { getRakutenSettingsStatus } from "@/lib/rakuten-settings";
import { getRakutenPrPlacement, updateRakutenPrPlacement } from "@/lib/rakuten-pr-settings";
import { getRakutenPrProducts } from "@/lib/rakuten-pr-data";
import { getRakutenPrDefinition, parseRakutenPrPlacement } from "@/lib/rakuten-pr";
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
  return NextResponse.json({ error: error instanceof RakutenSettingsError ? error.message : "楽天PRの掲載内容を処理できませんでした。時間をおいてお試しください。" }, {
    status: error instanceof RakutenSettingsError ? error.status : 503, headers,
  });
}

export async function GET(_request: Request, context: Context) {
  const denied = await authorize();
  if (denied) return denied;
  try {
    const definition = getRakutenPrDefinition((await context.params).placementId);
    const placement = await getRakutenPrPlacement(definition);
    return NextResponse.json({ placement, ...await getRakutenPrProducts([placement]) }, { headers });
  } catch (error) { return errorResponse(error); }
}

export async function PUT(request: Request, context: Context) {
  const denied = await authorize();
  if (denied) return denied;
  try {
    const definition = getRakutenPrDefinition((await context.params).placementId);
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) throw new RakutenSettingsError("この画面からもう一度操作してください。", 403);
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new RakutenSettingsError("掲載内容を確認してください。");
    const payload = await request.text();
    if (Buffer.byteLength(payload, "utf8") > 16384) throw new RakutenSettingsError("掲載内容が長すぎます。");
    let input: unknown;
    try { input = JSON.parse(payload); } catch { throw new RakutenSettingsError("掲載内容を確認してください。"); }
    const parsed = parseRakutenPrPlacement(input, definition);
    if (parsed.enabled) {
      const status = await getRakutenSettingsStatus();
      if (!status.configured || !status.hasAffiliateId) throw new RakutenSettingsError("公開するには楽天API設定とアフィリエイトIDを登録してください。");
      const { products, productError } = await getRakutenPrProducts([parsed]);
      if (productError) throw new RakutenSettingsError(productError, 502);
      if (parsed.items.some((selected) => !products.some((product) => product.itemCode === selected.itemCode && product.affiliateUrl))) {
        throw new RakutenSettingsError("取得できない商品があります。検索結果から選び直してください。", 400);
      }
    }
    const placement = await updateRakutenPrPlacement(definition, parsed);
    definition.revalidatePaths.forEach((path) => revalidatePath(path));
    revalidatePath("/admin/rakuten-pr");
    return NextResponse.json({ ok: true, placement }, { headers });
  } catch (error) { return errorResponse(error); }
}
