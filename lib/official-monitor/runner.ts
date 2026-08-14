import "server-only";

import { sendDiscordUpdate } from "@/lib/official-monitor/discord";
import { countSemanticDiffs, createSemanticDiff } from "@/lib/official-monitor/diff";
import { probeOfficialSources } from "@/lib/official-monitor/probe";
import { nextRunAt } from "@/lib/official-monitor/schedule";
import {
  attachImportDiffs,
  claimNextImportJob,
  createUpdateEvent,
  enqueueImportJob,
  finishImportJob,
  getOfficialMonitorSettings,
  getOfficialUpdateEvent,
  getPublishedDataForDate,
  getSourceStates,
  getStoredImportData,
  markImportEventFailed,
  markMonitorFinished,
  markMonitorStarted,
  pruneOfficialMonitorHistory,
  removeSourceState,
  saveSourceFingerprint,
} from "@/lib/official-monitor/repository";
import type { ImportJobPayload, MonitorRunResult } from "@/lib/official-monitor/types";
import { importFanStudioSchedules } from "@/lib/official-import/funstudio";
import { importHarmonylandOfficialSchedules } from "@/lib/official-import/harmonyland";
import type { ImportPreview } from "@/lib/official-import/types";
import { addDays, createRunId } from "@/lib/official-import/utils";
import { persistImportPreview } from "@/lib/supabase/schedule-repository";

function todayInJapan() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function filterPublishedSources(data: Awaited<ReturnType<typeof getPublishedDataForDate>>, payload: ImportJobPayload) {
  const scheduleSources = new Set<string>();
  if (payload.includeCalendar) scheduleSources.add("harmonyland-calendar");
  if (payload.includeFanStudio) scheduleSources.add("harmonyland-funstudio");
  return {
    schedules: data.schedules.filter((row) => scheduleSources.has(String(row.source_id))),
    operations: payload.includeCalendar ? data.operations.filter((row) => row.source_id === "harmonyland-calendar") : [],
    operatingDays: payload.includeCalendar ? data.operatingDays.filter((row) => row.source_id === "harmonyland-calendar") : [],
  };
}

async function importChangedDate(payload: ImportJobPayload): Promise<ImportPreview> {
  let preview: ImportPreview = {
    runId: createRunId(),
    generatedAt: new Date().toISOString(),
    rangeStart: payload.date,
    rangeEnd: payload.date,
    schedules: [],
    operations: [],
    operatingDays: [],
    documents: [],
    warnings: [],
  };
  if (payload.includeCalendar) {
    preview = await importHarmonylandOfficialSchedules({
      from: payload.date,
      to: payload.date,
      includeSchedules: true,
      includeParkOperatingDays: true,
      includeFanStudio: false,
    });
  }
  if (payload.includeFanStudio) {
    const fanStudio = await importFanStudioSchedules(payload.date, payload.date);
    preview.schedules.push(...fanStudio.schedules);
    preview.documents.push(...fanStudio.documents);
    preview.warnings.push(...fanStudio.warnings);
  }
  const changedHashes = new Set(payload.hashes);
  preview.documents = preview.documents.filter((document) => changedHashes.has(document.sha256));
  return preview;
}

async function processOneJob() {
  const job = await claimNextImportJob();
  if (!job) return null;
  try {
    const before = filterPublishedSources(await getPublishedDataForDate(job.payload.date), job.payload);
    const preview = await importChangedDate(job.payload);
    await persistImportPreview(preview, "detected-update");
    const after = await getStoredImportData(preview.runId);
    const diffs = createSemanticDiff(before, after);
    const counts = countSemanticDiffs(diffs);
    await attachImportDiffs(job.eventId, preview.runId, diffs, counts);
    await finishImportJob(job.id);
    const detail = await getOfficialUpdateEvent(job.eventId);
    if (detail) await sendDiscordUpdate(detail.event).catch(() => undefined);
    return { preview };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const retry = job.attempts < job.maxAttempts;
    await finishImportJob(job.id, message, retry);
    await markImportEventFailed(job.eventId, message, retry);
    const detail = await getOfficialUpdateEvent(job.eventId);
    if (detail && !retry) await sendDiscordUpdate(detail.event).catch(() => undefined);
    return { error: message };
  }
}

export async function runOfficialUpdateMonitor(force = false): Promise<MonitorRunResult> {
  const settings = await getOfficialMonitorSettings();
  const due = force || (settings.enabled && (!settings.nextRunAt || new Date(settings.nextRunAt).getTime() <= Date.now()));
  let baseline = false;
  let changedSources = 0;
  let queuedDates = 0;

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
          summary: `${date} の公式予定データが更新されました。自動取り込みを待機しています。`,
          currentSha256: group.hashes.join(":"),
          metadata: { includeCalendar: group.calendar, includeFanStudio: group.fanstudio },
        });
        await enqueueImportJob(event.id, {
          date,
          includeCalendar: group.calendar,
          includeFanStudio: group.fanstudio,
          hashes: group.hashes,
        });
        queuedDates += 1;
      }
      await pruneOfficialMonitorHistory(settings.retentionDays);
      await markMonitorFinished();
    } catch (error) {
      await markMonitorFinished(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  const processed = await processOneJob();
  return {
    checked: due,
    baseline,
    changedSources,
    queuedDates,
    processedJob: Boolean(processed),
    ...(processed && "preview" in processed && processed.preview ? { importPreview: processed.preview } : {}),
  };
}
