import { NextResponse } from "next/server";
import { publishDueArticles } from "@/lib/articles/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const configuredSecret = process.env.CRON_SECRET || process.env.ADMIN_IMPORT_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!configuredSecret || supplied !== configuredSecret) {
    return NextResponse.json({ error: "定期バッチの認証に失敗しました。" }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await publishDueArticles()) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "予約記事の公開に失敗しました。" },
      { status: 500 },
    );
  }
}
