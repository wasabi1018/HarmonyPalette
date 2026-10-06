import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/supabase/auth-server";
import { getRakutenSettings } from "@/lib/rakuten-settings";
import { searchRakutenProducts } from "@/lib/rakuten-api";
import { parseRakutenProductSearch } from "@/lib/rakuten-products";
import { RakutenSettingsError } from "@/lib/rakuten-settings-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const access = await getAdminAccess();
  if (!access.ok) return NextResponse.json({ error: "管理者としてログインしてください。" }, {
    status: access.reason === "unconfigured" ? 503 : access.reason === "forbidden" ? 403 : 401, headers,
  });
  try {
    const params = new URL(request.url).searchParams;
    const { keyword, page } = parseRakutenProductSearch(params.get("keyword"), params.get("page") ?? "1");
    const result = await searchRakutenProducts(await getRakutenSettings(), keyword, page);
    return NextResponse.json({ result }, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof RakutenSettingsError ? error.message : "商品検索を処理できませんでした。時間をおいてお試しください。" }, {
      status: error instanceof RakutenSettingsError ? error.status : 503, headers,
    });
  }
}
