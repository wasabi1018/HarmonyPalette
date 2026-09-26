import "server-only";

import { sendDiscordUpdate } from "@/lib/official-monitor/discord";
import { countSemanticDiffs, createSemanticDiff, importPreviewData, isAlreadyPublishedOfficialSource, meaningfulSemanticDiffs } from "@/lib/official-monitor/diff";
import { probeOfficialSources } from "@/lib/official-monitor/probe";
import { nextRunAt } from "@/lib/official-monitor/schedule";
import {
  buildOfficialUpdateSummary,
  diffNewsMetadata,
  mergeOfficialUpdateSection,
  totalOfficialUpdateCounts,
} from "@/lib/official-monitor/summary";
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
import type { MonitorRunResult, OfficialUpdateSection, PublishedData } from "@/lib/official-monitor/types";
import { importHarmonylandOfficialSchedules } from "@/lib/official-import/harmonyland";
import { addDays } from "@/lib/official-import/utils";

function todayInJapan() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function filterPublishedSources(data: Awaited<ReturnType<typeof getPublishedDataForDate>>) {
  return {
    schedules: data.schedules.filter((row) => row.source_id === "harmonyland-calendar"),
    operations: data.operations.filter((row) => row.source_id === "harmonyland-calendar"),
    operatingDays: data.operatingDays.filter((row) => row.source_id === "harmonyland-calendar"),
  };
}

async function previewChangedCalendarDate(date: string): Promise<ImportPreview> {
  return importHarmonylandOfficialSchedules({
    from: date,
    to: date,
    includeSchedules: true,
    includeParkOperatingDays: true,
  });
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
      const changedDates = new Set<string>();
      const sections: OfficialUpdateSection[] = [];
      const detectedHashes: string[] = [];
      const currentKeys = new Set(fingerprints.map((fingerprint) => `${fingerprint.sourceKey}:${fingerprint.entityKey}`));
      const publishedByDate = new Map<string, Promise<PublishedData>>();
      function publishedForDate(date: string) {
        let request = publishedByDate.get(date);
        if (!request) {
          request = getPublishedDataForDate(date);
          publishedByDate.set(date, request);
        }
        return request;
      }

      for (const fingerprint of fingerprints) {
        const key = `${fingerprint.sourceKey}:${fingerprint.entityKey}`;
        const previous = states.get(key);
        const changed = Boolean(previous && previous.normalizedSha256 !== fingerprint.normalizedSha256);
        const newlyMeaningful = !previous && !baseline && !(fingerprint.sourceKey === "calendar" && Number(fingerprint.metadata.recordCount || 0) === 0);
        let detected = changed || newlyMeaningful;
        if (detected && fingerprint.documentDate && fingerprint.sourceKey !== "news") {
          const published = await publishedForDate(fingerprint.documentDate);
          detected = !isAlreadyPublishedOfficialSource(fingerprint, published);
        }
        await saveSourceFingerprint(fingerprint, detected, detected);
        if (!detected) continue;
        changedSources += 1;
        detectedHashes.push(fingerprint.normalizedSha256);

        if (fingerprint.sourceKey === "news") {
          const newsDiff = diffNewsMetadata(previous?.metadata, fingerprint.metadata);
          mergeOfficialUpdateSection(sections, {
            key: "news",
            dates: [],
            diffCounts: newsDiff.diffCounts,
            highlights: newsDiff.highlights,
          });
          continue;
        }

        const date = fingerprint.documentDate;
        if (!date) continue;
        if (fingerprint.sourceKey === "calendar" || fingerprint.sourceKey === "daily-pdf") changedDates.add(date);
      }

      if (!baseline) {
        for (const [key, previous] of states) {
          if (currentKeys.has(key) || !previous.documentDate || previous.documentDate < from || previous.documentDate > to) continue;
          if (previous.sourceKey !== "daily-pdf") continue;
          await removeSourceState(previous.sourceKey, previous.entityKey);
          changedSources += 1;
          detectedHashes.push(`removed-${previous.normalizedSha256}`);
          changedDates.add(previous.documentDate);
        }
      }

      for (const date of changedDates) {
        const [published, preview] = await Promise.all([
          publishedForDate(date),
          previewChangedCalendarDate(date),
        ]);
        const diffs = meaningfulSemanticDiffs(createSemanticDiff(
          filterPublishedSources(published),
          importPreviewData(preview),
        ));
        if (diffs.length === 0) continue;
        mergeOfficialUpdateSection(sections, {
          key: "harmonyland-schedule",
          dates: [date],
          diffCounts: countSemanticDiffs(diffs),
          highlights: [],
        });
      }

      if (sections.length > 0) {
        const diffCounts = totalOfficialUpdateCounts(sections);
        const event = await createUpdateEvent({
          sourceKey: "official-site",
          entityKey: "summary",
          eventType: "source-modified",
          summary: buildOfficialUpdateSummary(sections),
          currentSha256: detectedHashes.join(":"),
          diffCounts,
          metadata: {
            notificationOnly: true,
            changedSections: sections.map((section) => section.key),
            sections,
            semanticDiffCount: Object.values(diffCounts).reduce((total, count) => total + count, 0),
          },
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
