import { NextResponse } from "next/server";
import { listArticleMedia } from "@/lib/articles/media-repository";
import { assertImportAuthorization } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  }
  try {
    return NextResponse.json({ media: await listArticleMedia() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "画像一覧の取得に失敗しました。" },
      { status: 400 },
    );
  }
}
