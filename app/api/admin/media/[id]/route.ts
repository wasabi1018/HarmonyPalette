import { NextResponse } from "next/server";
import {
  deleteArticleMedia,
  updateArticleMedia,
} from "@/lib/articles/media-repository";
import { isUuid } from "@/lib/articles/validation";
import { assertImportAuthorization } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorize(request: Request) {
  return assertImportAuthorization(request);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await authorize(request);
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  }
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "画像IDが正しくありません。" }, { status: 400 });
  }
  try {
    const body = await request.json() as { altText?: unknown };
    if (typeof body.altText !== "string") {
      return NextResponse.json({ error: "代替テキストの形式が正しくありません。" }, { status: 400 });
    }
    const media = await updateArticleMedia(id, body.altText);
    return media
      ? NextResponse.json({ ok: true, media })
      : NextResponse.json({ error: "画像が見つかりません。" }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "画像情報の更新に失敗しました。" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await authorize(request);
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  }
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "画像IDが正しくありません。" }, { status: 400 });
  }
  try {
    return await deleteArticleMedia(id)
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "画像が見つかりません。" }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "画像の削除に失敗しました。" },
      { status: 400 },
    );
  }
}
