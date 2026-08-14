import { NextResponse } from "next/server";
import { sendDiscordUpdate } from "@/lib/official-monitor/discord";
import { assertImportAuthorization } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  try {
    await sendDiscordUpdate({
      id: "test",
      sourceKey: "test",
      entityKey: "通知テスト",
      eventType: "source-modified",
      summary: "Discord通知テスト",
      importRunId: null,
      reviewStatus: "pending",
      diffCounts: {},
      metadata: {},
      createdAt: new Date().toISOString(),
      reviewedAt: null,
    }, true);
    return NextResponse.json({ sent: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Discord通知に失敗しました。" }, { status: 500 });
  }
}
