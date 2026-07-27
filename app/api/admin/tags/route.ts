import { NextResponse } from "next/server";
import {
  createTag,
  listTags,
} from "@/lib/articles/repository";
import { parseTagInput } from "@/lib/articles/validation";
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

export async function GET(request: Request) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.message },
      { status: authorization.status },
    );
  }
  try {
    return NextResponse.json({ tags: await listTags() });
  } catch (error) {
    return errorResponse(error, "タグの取得に失敗しました。");
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
    return NextResponse.json(
      { ok: true, tag: await createTag(parseTagInput(await request.json())) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error, "タグの作成に失敗しました。");
  }
}
