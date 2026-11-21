import { NextResponse } from "next/server";
import { getPublicGuideCatalog } from "@/lib/guides/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ data: await getPublicGuideCatalog() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "攻略ガイドを読み込めませんでした。時間をおいてもう一度お試しください。" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
