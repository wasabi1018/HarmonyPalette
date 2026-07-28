import { NextResponse } from "next/server";
import {
  deleteArticleSeries,
  updateArticleSeries,
} from "@/lib/articles/series-repository";
import { isUuid, parseSeriesInput } from "@/lib/articles/validation";
import { assertImportAuthorization } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const conflict = /duplicate key|already exists|unique/i.test(message);
  return NextResponse.json(
    { error: conflict ? "同じ名前またはスラッグのシリーズがすでに存在します。" : message },
    { status: conflict ? 409 : 400 },
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  }
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "シリーズIDが正しくありません。" }, { status: 400 });
  try {
    const series = await updateArticleSeries(id, parseSeriesInput(await request.json()));
    return series
      ? NextResponse.json({ ok: true, series })
      : NextResponse.json({ error: "シリーズが見つかりません。" }, { status: 404 });
  } catch (error) {
    return errorResponse(error, "シリーズの更新に失敗しました。");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  }
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "シリーズIDが正しくありません。" }, { status: 400 });
  try {
    return await deleteArticleSeries(id)
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "シリーズが見つかりません。" }, { status: 404 });
  } catch (error) {
    return errorResponse(error, "シリーズの削除に失敗しました。");
  }
}
