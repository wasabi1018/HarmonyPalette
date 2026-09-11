import { NextResponse } from "next/server";
import { publishDueArticles } from "@/lib/articles/repository";
import { revalidatePublicArticleData } from "@/lib/public-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const configuredSecret = process.env.CRON_SECRET || process.env.ADMIN_IMPORT_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!configuredSecret || supplied !== configuredSecret) {
    return NextResponse.json({ error: "定期バッチの認証に失敗しました。" }, { status: 401 });
  }
  try {
    const result = await publishDueArticles();
    if (result.publishedCount > 0) revalidatePublicArticleData();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "予約記事の公開に失敗しました。" },
      { status: 500 },
    );
  }
}
