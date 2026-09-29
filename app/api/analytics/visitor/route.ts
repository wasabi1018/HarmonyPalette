import { NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/analytics/request";
import {
  currentJapanDate,
  hashDailyVisitorToken,
  isValidDailyVisitorToken,
  shouldRecordDailyUniqueVisitor,
} from "@/lib/analytics/unique-visitor";
import { recordDailyUniqueVisitor } from "@/lib/articles/analytics-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "許可されていないリクエストです。" }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as { visitorToken?: unknown } | null;
  if (!isValidDailyVisitorToken(body?.visitorToken)) {
    return NextResponse.json({ error: "訪問識別子が正しくありません。" }, { status: 400 });
  }

  if (!shouldRecordDailyUniqueVisitor()) {
    return new NextResponse(null, { status: 204 });
  }

  const visitDate = currentJapanDate();
  const visitorHash = hashDailyVisitorToken(body.visitorToken, visitDate);
  try {
    await recordDailyUniqueVisitor(visitDate, visitorHash);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "ユニーク訪問を記録できませんでした。" }, { status: 503 });
  }
}
