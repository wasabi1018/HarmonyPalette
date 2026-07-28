import { NextResponse } from "next/server";
import {
  createArticleSeries,
  listArticleSeries,
} from "@/lib/articles/series-repository";
import { parseSeriesInput } from "@/lib/articles/validation";
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

export async function GET(request: Request) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  }
  try {
    return NextResponse.json({ series: await listArticleSeries() });
  } catch (error) {
    return errorResponse(error, "シリーズの取得に失敗しました。");
  }
}

export async function POST(request: Request) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  }
  try {
    return NextResponse.json(
      { ok: true, series: await createArticleSeries(parseSeriesInput(await request.json())) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error, "シリーズの作成に失敗しました。");
  }
}
