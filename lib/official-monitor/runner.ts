import "server-only";

import { sendDiscordUpdate } from "@/lib/official-monitor/discord";
import { countSemanticDiffs, createSemanticDiff, importPreviewData, meaningfulSemanticDiffs } from "@/lib/official-monitor/diff";
import { probeOfficialSources } from "@/lib/official-monitor/probe";
import { nextRunAt } from "@/lib/official-monitor/schedule";
import {
  createUpdateEvent,
  getOfficialMonitorSettings,
  getPublishedDataForDate,
  getSourceStates,
  markMonitorFinished,
  markMonitorStarted,
  pruneOfficialMonitorHistory,
  removeSourceState,
  saveSourceFingerprint,
} from "@/lib/official-monitor/repository";
import type { MonitorRunResult } from "@/lib/official-monitor/types";
import { importFanStudioSchedules } from "@/lib/official-import/funstudio";
import { importHarmonylandOfficialSchedules } from "@/lib/official-import/harmonyland";
import type { ImportPreview } from "@/lib/official-import/types";
import { addDays, createRunId } from "@/lib/official-import/utils";

function todayInJapan() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

type ChangedDate = { calendar: boolean; fanstudio: boolean; hashes: string[] };

function filterPublishedSources(data: Awaited<ReturnType<typeof getPublishedDataForDate>>, group: ChangedDate) {
  const scheduleSources = new Set<string>();
  if (group.calendar) scheduleSources.add("harmonyland-calendar");
  if (group.fanstudio) scheduleSources.add("harmonyland-funstudio");
  return {
    schedules: data.schedules.filter((row) => scheduleSources.has(String(row.source_id))),
    operations: group.calendar ? data.operations.filter((row) => row.source_id === "harmonyland-calendar") : [],
    operatingDays: group.calendar ? data.operatingDays.filter((row) => row.source_id === "harmonyland-calendar") : [],
  };
}

async function previewChangedDate(date: string, group: ChangedDate): Promise<ImportPreview> {
  let preview: ImportPreview = {
    runId: createRunId(),
    generatedAt: new Date().toISOString(),
    rangeStart: date,
    rangeEnd: date,
    schedules: [],
    operations: [],
    operatingDays: [],
    documents: [],
    warnings: [],
  };
  if (group.calendar) {
    preview = await importHarmonylandOfficialSchedules({
      from: date,
      to: date,
      includeSchedules: true,
      includeParkOperatingDays: true,
      includeFanStudio: false,
    });
  }
  if (group.fanstudio) {
    const fanStudio = await importFanStudioSchedules(date, date);
    preview.schedules.push(...fanStudio.schedules);
    preview.documents.push(...fanStudio.documents);
    preview.warnings.push(...fanStudio.warnings);
  }
  return preview;
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
      const changedByDate = new Map<string, ChangedDate>();
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
        const [published, preview] = await Promise.all([
          getPublishedDataForDate(date),
          previewChangedDate(date, group),
        ]);
        const diffs = meaningfulSemanticDiffs(createSemanticDiff(
          filterPublishedSources(published, group),
          importPreviewData(preview),
        ));
        if (diffs.length === 0) continue;
        const diffCounts = countSemanticDiffs(diffs);
        const event = await createUpdateEvent({
          sourceKey: "structured-schedule",
          entityKey: date,
          eventType: "source-modified",
          summary: `${date} の公式予定データが更新されました。公式サイトで内容を確認してください。`,
          currentSha256: group.hashes.join(":"),
          diffCounts,
          metadata: { includeCalendar: group.calendar, includeFanStudio: group.fanstudio, notificationOnly: true, semanticDiffCount: diffs.length },
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
