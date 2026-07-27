import { NextResponse } from "next/server";
import {
  deleteTag,
  updateTag,
} from "@/lib/articles/repository";
import { isUuid, parseTagInput } from "@/lib/articles/validation";
import { assertImportAuthorization } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const conflict = /duplicate key|already exists|unique/i.test(message);
  return NextResponse.json(
    { error: conflict ? "同じ名前またはスラッグのタグがすでに存在します。" : message },
    { status: conflict ? 409 : 400 },
  );
}

export async function PATCH(
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
  if (!isUuid(id)) return NextResponse.json({ error: "タグIDが正しくありません。" }, { status: 400 });

  try {
    const tag = await updateTag(id, parseTagInput(await request.json()));
    return tag
      ? NextResponse.json({ ok: true, tag })
      : NextResponse.json({ error: "タグが見つかりません。" }, { status: 404 });
  } catch (error) {
    return errorResponse(error, "タグの更新に失敗しました。");
  }
}

export async function DELETE(
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
  if (!isUuid(id)) return NextResponse.json({ error: "タグIDが正しくありません。" }, { status: 400 });

  try {
    return await deleteTag(id)
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "タグが見つかりません。" }, { status: 404 });
  } catch (error) {
    return errorResponse(error, "タグの削除に失敗しました。");
  }
}
