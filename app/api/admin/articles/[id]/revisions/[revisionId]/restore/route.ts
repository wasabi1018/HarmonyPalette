import { NextResponse } from "next/server";
import { restoreArticleRevision } from "@/lib/articles/repository";
import { isUuid } from "@/lib/articles/validation";
import { getAdminAccess } from "@/lib/supabase/auth-server";
import { assertImportAuthorization } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; revisionId: string }> },
) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.message },
      { status: authorization.status },
    );
  }
  const { id, revisionId } = await params;
  if (!isUuid(id) || !isUuid(revisionId)) {
    return NextResponse.json({ error: "変更履歴IDが正しくありません。" }, { status: 400 });
  }
  try {
    const access = await getAdminAccess();
    const article = await restoreArticleRevision(
      id,
      revisionId,
      access.ok ? access.user.id : null,
    );
    return article
      ? NextResponse.json({ ok: true, article })
      : NextResponse.json({ error: "変更履歴が見つかりません。" }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "変更履歴の復元に失敗しました。" },
      { status: 400 },
    );
  }
}
