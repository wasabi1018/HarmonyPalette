import { NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/analytics/request";
import { incrementArticleView } from "@/lib/articles/analytics-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,119}$/;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!SLUG_PATTERN.test(slug)) {
    return NextResponse.json({ error: "記事スラッグが正しくありません。" }, { status: 400 });
  }
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "許可されていないリクエストです。" }, { status: 403 });
  }
  try {
    return await incrementArticleView(slug)
      ? new NextResponse(null, { status: 204 })
      : NextResponse.json({ error: "記事が見つかりません。" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "閲覧数を記録できませんでした。" }, { status: 503 });
  }
}
