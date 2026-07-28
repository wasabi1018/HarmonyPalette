import { NextResponse } from "next/server";
import { listArticleRevisions } from "@/lib/articles/repository";
import { isUuid } from "@/lib/articles/validation";
import { assertImportAuthorization } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.message },
      { status: authorization.status },
    );
  }
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "記事IDが正しくありません。" }, { status: 400 });
  }
  try {
    return NextResponse.json({ revisions: await listArticleRevisions(id) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "変更履歴の取得に失敗しました。" },
      { status: 400 },
    );
  }
}
