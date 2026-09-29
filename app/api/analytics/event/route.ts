import { NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/analytics/request";
import { incrementSiteAnalyticsEvent } from "@/lib/articles/analytics-repository";
import type { SiteAnalyticsEvent } from "@/lib/articles/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_EVENTS = new Set<SiteAnalyticsEvent>([
  "home_view",
  "plan_created",
  "plan_image_saved",
  "plan_shared",
]);

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "許可されていないリクエストです。" }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as { eventName?: unknown } | null;
  const eventName = body?.eventName;
  if (typeof eventName !== "string" || !SITE_EVENTS.has(eventName as SiteAnalyticsEvent)) {
    return NextResponse.json({ error: "集計対象が正しくありません。" }, { status: 400 });
  }

  try {
    return await incrementSiteAnalyticsEvent(eventName as SiteAnalyticsEvent)
      ? new NextResponse(null, { status: 204 })
      : NextResponse.json({ error: "集計対象が正しくありません。" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "アクセス数を記録できませんでした。" }, { status: 503 });
  }
}
