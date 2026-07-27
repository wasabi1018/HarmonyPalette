import { NextResponse } from "next/server";
import {
  createArticle,
  listAdminArticles,
} from "@/lib/articles/repository";
import { parseArticleInput } from "@/lib/articles/validation";
import { getAdminAccess } from "@/lib/supabase/auth-server";
import { assertImportAuthorization } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const conflict = /duplicate key|already exists|unique/i.test(message);
  return NextResponse.json(
    { error: conflict ? "同じスラッグの記事がすでに存在します。" : message },
    { status: conflict ? 409 : 400 },
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
    return NextResponse.json({ articles: await listAdminArticles() });
  } catch (error) {
    return errorResponse(error, "記事一覧の取得に失敗しました。");
  }
}

export async function POST(request: Request) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.message },
      { status: authorization.status },
    );
  }

  try {
    const access = await getAdminAccess();
    const article = await createArticle(
      parseArticleInput(await request.json()),
      access.ok ? access.user.id : null,
    );
    return NextResponse.json({ ok: true, article }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "記事の作成に失敗しました。");
  }
}
