import { NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/analytics/request";
import { incrementSiteAnalyticsEvent } from "@/lib/articles/analytics-repository";
import type { SiteAnalyticsEvent } from "@/lib/articles/types";
import { parseHotelEvents } from "@/lib/hotels/events";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { limitedBody } from "@/lib/travel/admin-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_EVENTS = new Set<SiteAnalyticsEvent>([
  "home_view",
  "crowd_forecast_view",
  "plan_created",
  "plan_image_saved",
  "plan_shared",
]);

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "許可されていないリクエストです。" }, { status: 403 });
  }

  let body: { eventName?: unknown; hotelEvents?: unknown } | null = null;
  try { body = JSON.parse(new TextDecoder().decode(await limitedBody(request, 32000))); } catch {}
  if (body?.hotelEvents !== undefined) {
    let events;
    try { events = parseHotelEvents(body.hotelEvents); } catch { return NextResponse.json({ error: "計測内容が正しくありません。" }, { status: 400 }); }
    try { const client = getSupabaseAdminClient(); if (!client) throw new Error("setup"); const { error } = await client.rpc("record_hotel_events", { p_events: events }); if (error) throw error; return new NextResponse(null, { status: 204 }); }
    catch { return NextResponse.json({ error: "ホテル分析を記録できませんでした。" }, { status: 503 }); }
  }
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
