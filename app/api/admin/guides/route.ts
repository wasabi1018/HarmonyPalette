import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminAccess } from "@/lib/supabase/auth-server";
import { getGuideManagementData, saveGuideConfiguration } from "@/lib/guides/repository";
import { parseGuideConfiguration } from "@/lib/guides/model";
import { revalidatePublicArticleData } from "@/lib/public-cache";

export const dynamic = "force-dynamic";
async function authorize() {
  const access = await getAdminAccess();
  return access.ok ? null : NextResponse.json({ error: "管理者としてログインしてください。" }, { status: access.reason === "forbidden" ? 403 : access.reason === "unconfigured" ? 503 : 401 });
}
export async function GET() {
  const denied = await authorize(); if (denied) return denied;
  try { return NextResponse.json({ data: await getGuideManagementData() }); }
  catch { return NextResponse.json({ error: "攻略ガイド設定を取得できませんでした。" }, { status: 503 }); }
}
export async function PUT(request: Request) {
  const denied = await authorize(); if (denied) return denied;
  let configuration;
  try { configuration = parseGuideConfiguration(await request.json()); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "設定を確認してください。" }, { status: 400 }); }
  try {
    await saveGuideConfiguration(configuration);
    revalidatePublicArticleData(); revalidatePath("/guides"); revalidatePath("/admin/guides");
    return NextResponse.json({ ok: true, data: await getGuideManagementData() });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "設定を保存できませんでした。" }, { status: 409 }); }
}
