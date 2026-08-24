import "server-only";

import { sendDiscordUpdate } from "@/lib/official-monitor/discord";
import { probeOfficialSources } from "@/lib/official-monitor/probe";
import { nextRunAt } from "@/lib/official-monitor/schedule";
import {
  createUpdateEvent,
  getOfficialMonitorSettings,
  getSourceStates,
  markMonitorFinished,
  markMonitorStarted,
  pruneOfficialMonitorHistory,
  removeSourceState,
  saveSourceFingerprint,
} from "@/lib/official-monitor/repository";
import type { MonitorRunResult } from "@/lib/official-monitor/types";
import { addDays } from "@/lib/official-import/utils";

function todayInJapan() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export async function runOfficialUpdateMonitor(force = false): Promise<MonitorRunResult> {
  const settings = await getOfficialMonitorSettings();
  const due = force || (settings.enabled && (!settings.nextRunAt || new Date(settings.nextRunAt).getTime() <= Date.now()));
  let baseline = false;
  let changedSources = 0;
  const queuedDates = 0;

  if (due) {
    await markMonitorStarted(nextRunAt(settings.scheduledTime));
    try {
      const from = todayInJapan();
      const to = addDays(from, settings.lookaheadDays - 1);
      const [states, fingerprints] = await Promise.all([getSourceStates(), probeOfficialSources(from, to)]);
      baseline = states.size === 0;
      const changedByDate = new Map<string, { calendar: boolean; fanstudio: boolean; hashes: string[] }>();
      const currentKeys = new Set(fingerprints.map((fingerprint) => `${fingerprint.sourceKey}:${fingerprint.entityKey}`));

      for (const fingerprint of fingerprints) {
        const key = `${fingerprint.sourceKey}:${fingerprint.entityKey}`;
        const previous = states.get(key);
        const changed = Boolean(previous && previous.normalizedSha256 !== fingerprint.normalizedSha256);
        const newlyMeaningful = !previous && !baseline && !(fingerprint.sourceKey === "calendar" && Number(fingerprint.metadata.recordCount || 0) === 0);
        const detected = changed || newlyMeaningful;
        await saveSourceFingerprint(fingerprint, detected, detected);
        if (!detected) continue;
        changedSources += 1;

        if (fingerprint.sourceKey === "news") {
          const event = await createUpdateEvent({
            sourceKey: "news",
            entityKey: "index",
            eventType: "news",
            summary: "ハーモニーランド公式サイトのお知らせ一覧が更新されました。",
            previousSha256: previous?.normalizedSha256,
            currentSha256: fingerprint.normalizedSha256,
            metadata: fingerprint.metadata,
          });
          await sendDiscordUpdate(event).catch(() => undefined);
          continue;
        }

        const date = fingerprint.documentDate;
        if (!date) continue;
        const group = changedByDate.get(date) ?? { calendar: false, fanstudio: false, hashes: [] };
        group.calendar ||= fingerprint.sourceKey === "calendar" || fingerprint.sourceKey === "daily-pdf";
        group.fanstudio ||= fingerprint.sourceKey === "funstudio";
        group.hashes.push(fingerprint.normalizedSha256);
        changedByDate.set(date, group);
      }

      if (!baseline) {
        for (const [key, previous] of states) {
          if (currentKeys.has(key) || !previous.documentDate || previous.documentDate < from || previous.documentDate > to) continue;
          if (previous.sourceKey !== "daily-pdf" && previous.sourceKey !== "funstudio") continue;
          await removeSourceState(previous.sourceKey, previous.entityKey);
          changedSources += 1;
          const group = changedByDate.get(previous.documentDate) ?? { calendar: false, fanstudio: false, hashes: [] };
          group.calendar ||= previous.sourceKey === "daily-pdf";
          group.fanstudio ||= previous.sourceKey === "funstudio";
          group.hashes.push(`removed-${previous.normalizedSha256}`);
          changedByDate.set(previous.documentDate, group);
        }
      }

      for (const [date, group] of changedByDate) {
        const event = await createUpdateEvent({
          sourceKey: "structured-schedule",
          entityKey: date,
          eventType: "source-modified",
          summary: `${date} の公式予定データが更新されました。公式サイトで内容を確認してください。`,
          currentSha256: group.hashes.join(":"),
          metadata: { includeCalendar: group.calendar, includeFanStudio: group.fanstudio, notificationOnly: true },
        });
        await sendDiscordUpdate(event).catch(() => undefined);
      }
      await pruneOfficialMonitorHistory(settings.retentionDays);
      await markMonitorFinished();
    } catch (error) {
      await markMonitorFinished(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  return {
    checked: due,
    baseline,
    changedSources,
    queuedDates,
    processedJob: false,
  };
}
