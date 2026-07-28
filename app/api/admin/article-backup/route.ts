import { NextResponse } from "next/server";
import {
  createArticleBackup,
  createArticleCatalogCsv,
} from "@/lib/articles/backup";
import { assertImportAuthorization } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fileDate() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
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
    const backup = await createArticleBackup();
    const format = new URL(request.url).searchParams.get("format") === "csv"
      ? "csv"
      : "json";
    const isCsv = format === "csv";
    const body = isCsv
      ? createArticleCatalogCsv(backup)
      : JSON.stringify(backup, null, 2);
    return new Response(body, {
      headers: {
        "Content-Type": isCsv
          ? "text/csv; charset=utf-8"
          : "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="harmony-palette-articles-${fileDate()}.${format}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "バックアップの作成に失敗しました。" },
      { status: 500 },
    );
  }
}
