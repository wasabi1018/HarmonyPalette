import { NextResponse } from "next/server";
import { duplicateArticle } from "@/lib/articles/repository";
import { isUuid } from "@/lib/articles/validation";
import { getAdminAccess } from "@/lib/supabase/auth-server";
import { assertImportAuthorization } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
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
    const access = await getAdminAccess();
    const article = await duplicateArticle(id, access.ok ? access.user.id : null);
    return article
      ? NextResponse.json({ ok: true, article }, { status: 201 })
      : NextResponse.json({ error: "記事が見つかりません。" }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "記事の複製に失敗しました。" },
      { status: 400 },
    );
  }
}
