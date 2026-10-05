import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getHomepageSettings, updateHomepageSettings } from "@/lib/homepage-settings";
import { getAdminAccess } from "@/lib/supabase/auth-server";
import { normalizeHomepageGuideCards } from "@/lib/homepage-guide-cards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorize() {
  const access = await getAdminAccess();
  if (access.ok) return null;
  return NextResponse.json({ error: "管理者としてログインしてください。" }, {
    status: access.reason === "unconfigured" ? 503 : access.reason === "forbidden" ? 403 : 401,
  });
}

export async function GET() {
  const denied = await authorize();
  if (denied) return denied;
  try {
    return NextResponse.json({ settings: await getHomepageSettings() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "設定を取得できませんでした。" }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const denied = await authorize();
  if (denied) return denied;
  let guideCards;
  try {
    const input = await request.json() as { guideCards?: unknown };
    guideCards = normalizeHomepageGuideCards(input?.guideCards);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "入力内容を確認してください。" }, { status: 400 });
  }
  try {
    const settings = await updateHomepageSettings(guideCards);
    revalidatePath("/");
    revalidatePath("/admin/homepage");
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "設定を保存できませんでした。" }, { status: 503 });
  }
}
