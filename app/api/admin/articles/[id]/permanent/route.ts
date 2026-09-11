import { NextResponse } from "next/server";
import { permanentlyDeleteArticle } from "@/lib/articles/repository";
import { isUuid } from "@/lib/articles/validation";
import { revalidatePublicArticleData } from "@/lib/public-cache";
import { assertImportAuthorization } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  }
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "記事IDが正しくありません。" }, { status: 400 });
  }
  try {
    const deleted = await permanentlyDeleteArticle(id);
    if (!deleted) {
      return NextResponse.json({ error: "ゴミ箱の記事が見つかりません。" }, { status: 404 });
    }
    revalidatePublicArticleData();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "記事を完全削除できませんでした。" },
      { status: 400 },
    );
  }
}
