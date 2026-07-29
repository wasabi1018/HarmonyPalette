import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  getInstagramEmbedSettings,
  updateInstagramEmbedSettings,
} from "@/lib/instagram-settings";
import { assertImportAuthorization } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown, fallback: string) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallback },
    { status: 400 },
  );
}

export async function GET(request: Request) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.message },
      { status: authorization.status },
    );
  }
  try {
    return NextResponse.json({ settings: await getInstagramEmbedSettings() });
  } catch (error) {
    return errorResponse(error, "Instagram表示設定の取得に失敗しました。");
  }
}

export async function PUT(request: Request) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.message },
      { status: authorization.status },
    );
  }
  try {
    const input = await request.json() as { postUrls?: unknown };
    const settings = await updateInstagramEmbedSettings(input.postUrls);
    revalidatePath("/");
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    return errorResponse(error, "Instagram表示設定の保存に失敗しました。");
  }
}
