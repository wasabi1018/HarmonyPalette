import "server-only";

import type { MonitorEvent } from "@/lib/official-monitor/types";
import { getDiscordWebhookUrl, recordNotification } from "@/lib/official-monitor/repository";
import { SITE_URL } from "@/lib/site-config";

export function isDiscordWebhookUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && ["discord.com", "discordapp.com"].includes(url.hostname)
      && /^\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}

function countsText(counts: Record<string, number>) {
  const labels: Record<string, string> = { added: "追加", modified: "変更", removed: "削除候補", uncertain: "要確認" };
  const values = Object.entries(labels).flatMap(([key, label]) => counts[key] ? [`${label} ${counts[key]}件`] : []);
  return values.length ? values.join(" / ") : "内容差分なし（原本のみ変更）";
}

export async function sendDiscordUpdate(event: MonitorEvent, test = false) {
  const webhook = await getDiscordWebhookUrl();
  if (!webhook) throw new Error("Discord Webhookが設定されていません。");
  if (!isDiscordWebhookUrl(webhook)) throw new Error("Discord Webhook URLの形式が正しくありません。");

  const reviewUrl = new URL(`/admin/official-updates?event=${event.id}`, SITE_URL).toString();
  const response = await fetch(`${webhook}?wait=true`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: "Harmony Palette 更新監視",
      allowed_mentions: { parse: [] },
      embeds: [{
        title: test ? "Discord通知テスト" : event.eventType === "news" ? "公式サイトのお知らせ更新" : "公式データの更新を検出",
        description: test ? "Harmony Paletteの公式更新監視から正常に通知できました。" : event.summary,
        url: reviewUrl,
        color: event.eventType === "import-failed" ? 0xdc2626 : 0xef8099,
        fields: test ? [] : [
          { name: "対象", value: event.entityKey, inline: true },
          { name: "差分", value: countsText(event.diffCounts), inline: true },
          { name: "公開状態", value: event.importRunId ? "確認待ち（自動公開されていません）" : "通知のみ", inline: false },
        ],
        timestamp: new Date().toISOString(),
      }],
    }),
  });
  if (!response.ok) {
    const message = `Discord通知に失敗しました（HTTP ${response.status}）`;
    if (!test) await recordNotification(event.id, { ok: false, error: message });
    throw new Error(message);
  }
  const body = await response.json().catch(() => null) as { id?: string } | null;
  if (!test) await recordNotification(event.id, { ok: true, providerId: body?.id });
  return { sent: true };
}
