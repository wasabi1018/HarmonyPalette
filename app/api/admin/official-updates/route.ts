import { NextResponse } from "next/server";
import { isDiscordWebhookUrl } from "@/lib/official-monitor/discord";
import { getOfficialMonitorSettings, listOfficialUpdateEvents, updateOfficialMonitorSettings } from "@/lib/official-monitor/repository";
import { assertImportAuthorization } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  try {
    const [settings, events] = await Promise.all([getOfficialMonitorSettings(), listOfficialUpdateEvents()]);
    return NextResponse.json({ settings, events });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "監視情報を取得できませんでした。" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  try {
    const body = await request.json() as Record<string, unknown>;
    const scheduledTime = String(body.scheduledTime ?? "");
    if (!/^(?:[01]\d|2[0-3]):(?:00|15|30|45)$/.test(scheduledTime)) {
      return NextResponse.json({ error: "監視時刻は15分単位で指定してください。" }, { status: 400 });
    }
    const lookaheadDays = Number(body.lookaheadDays);
    const retentionDays = Number(body.retentionDays);
    const maxStorageMegabytes = Number(body.maxStorageMegabytes);
    if (!Number.isInteger(lookaheadDays) || lookaheadDays < 1 || lookaheadDays > 31) {
      return NextResponse.json({ error: "監視範囲は1〜31日で指定してください。" }, { status: 400 });
    }
    if (!Number.isInteger(retentionDays) || retentionDays < 7 || retentionDays > 365) {
      return NextResponse.json({ error: "原本保持日数は7〜365日で指定してください。" }, { status: 400 });
    }
    if (!Number.isInteger(maxStorageMegabytes) || maxStorageMegabytes < 10 || maxStorageMegabytes > 500) {
      return NextResponse.json({ error: "原本保存上限は10〜500MBで指定してください。" }, { status: 400 });
    }
    const webhook = typeof body.discordWebhookUrl === "string" ? body.discordWebhookUrl.trim() : "";
    if (webhook && !isDiscordWebhookUrl(webhook)) {
      return NextResponse.json({ error: "Discord Incoming Webhook URLを入力してください。" }, { status: 400 });
    }
    const settings = await updateOfficialMonitorSettings({
      enabled: Boolean(body.enabled),
      scheduledTime,
      lookaheadDays,
      retentionDays,
      maxStorageBytes: maxStorageMegabytes * 1024 * 1024,
      discordWebhookUrl: webhook || undefined,
    });
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "監視設定を更新できませんでした。" }, { status: 500 });
  }
}
