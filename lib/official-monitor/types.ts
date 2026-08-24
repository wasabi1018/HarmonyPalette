import type { ImportPreview } from "@/lib/official-import/types";

export type OfficialMonitorSettings = {
  enabled: boolean;
  scheduledTime: string;
  timezone: "Asia/Tokyo";
  lookaheadDays: number;
  nextRunAt: string | null;
  lastStartedAt: string | null;
  lastSucceededAt: string | null;
  lastError: string | null;
  consecutiveFailures: number;
  discordConfigured: boolean;
  discordWebhookMasked: string | null;
  retentionDays: number;
  maxStorageBytes: number;
};

export type SourceFingerprint = {
  sourceKey: "calendar" | "daily-pdf" | "funstudio" | "news";
  entityKey: string;
  sourceUrl: string;
  contentType: string;
  rawSha256: string;
  normalizedSha256: string;
  documentDate?: string;
  bytes: Uint8Array;
  metadata: Record<string, unknown>;
};

export type SourceState = Omit<SourceFingerprint, "bytes"> & {
  lastChangedAt?: string;
};

export type MonitorEvent = {
  id: string;
  sourceKey: string;
  entityKey: string;
  eventType: string;
  summary: string;
  importRunId: string | null;
  reviewStatus: "pending" | "reviewed" | "ignored";
  diffCounts: Record<string, number>;
  metadata: Record<string, unknown>;
  createdAt: string;
  reviewedAt: string | null;
};

export function isNotificationOnlyEvent(event: Pick<MonitorEvent, "eventType" | "importRunId" | "metadata">) {
  return !event.importRunId && (event.eventType === "news" || event.metadata.notificationOnly === true);
}

export type PublishedData = {
  schedules: Array<Record<string, unknown>>;
  operations: Array<Record<string, unknown>>;
  operatingDays: Array<Record<string, unknown>>;
};

export type StoredImportData = {
  schedules: Array<Record<string, unknown>>;
  operations: Array<Record<string, unknown>>;
  operatingDays: Array<Record<string, unknown>>;
};

export type SemanticDiff = {
  entityType: "schedule" | "operation" | "operating-day";
  changeType: "added" | "modified" | "removed" | "unchanged" | "uncertain";
  matchConfidence: number;
  beforeRecordId: string | null;
  afterRecordId: string | null;
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
  fieldChanges: Record<string, { before: unknown; after: unknown }>;
};

export type ImportJobPayload = {
  date: string;
  includeCalendar: boolean;
  includeFanStudio: boolean;
  hashes: string[];
};

export type MonitorRunResult = {
  checked: boolean;
  baseline: boolean;
  changedSources: number;
  queuedDates: number;
  processedJob: boolean;
  importPreview?: Pick<ImportPreview, "runId" | "rangeStart" | "rangeEnd">;
};
