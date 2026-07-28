import { NextResponse } from "next/server";
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
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host") || requestUrl.host;
  const protocol = request.headers.get("x-forwarded-proto") || requestUrl.protocol.replace(":", "");
  const expectedOrigin = `${protocol}://${host}`;
  if (fetchSite !== "same-origin" || !origin || origin !== expectedOrigin) {
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
