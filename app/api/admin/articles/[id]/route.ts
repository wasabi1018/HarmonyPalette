import { NextResponse } from "next/server";
import {
  getAdminArticle,
  trashArticle,
  updateArticle,
} from "@/lib/articles/repository";
import { isUuid, parseArticleInput } from "@/lib/articles/validation";
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

async function authorize(request: Request) {
  return assertImportAuthorization(request);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await authorize(request);
  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.message },
      { status: authorization.status },
    );
  }
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "記事IDが正しくありません。" }, { status: 400 });
  try {
    const article = await getAdminArticle(id);
    return article
      ? NextResponse.json({ article })
      : NextResponse.json({ error: "記事が見つかりません。" }, { status: 404 });
  } catch (error) {
    return errorResponse(error, "記事の取得に失敗しました。");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await authorize(request);
  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.message },
      { status: authorization.status },
    );
  }
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "記事IDが正しくありません。" }, { status: 400 });

  try {
    const access = await getAdminAccess();
    const article = await updateArticle(
      id,
      parseArticleInput(await request.json()),
      access.ok ? access.user.id : null,
    );
    return article
      ? NextResponse.json({ ok: true, article })
      : NextResponse.json({ error: "記事が見つかりません。" }, { status: 404 });
  } catch (error) {
    return errorResponse(error, "記事の更新に失敗しました。");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await authorize(request);
  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.message },
      { status: authorization.status },
    );
  }
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "記事IDが正しくありません。" }, { status: 400 });

  try {
    const access = await getAdminAccess();
    return await trashArticle(id, access.ok ? access.user.id : null)
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "記事が見つかりません。" }, { status: 404 });
  } catch (error) {
    return errorResponse(error, "記事をゴミ箱へ移動できませんでした。");
  }
}
