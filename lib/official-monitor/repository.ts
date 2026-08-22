import "server-only";

import type {
  ImportJobPayload,
  MonitorEvent,
  OfficialMonitorSettings,
  PublishedData,
  SemanticDiff,
  SourceFingerprint,
  SourceState,
  StoredImportData,
} from "@/lib/official-monitor/types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

function client() {
  const value = getSupabaseAdminClient();
  if (!value) throw new Error("Supabaseのサーバー用秘密鍵が設定されていません。");
  return value;
}

function timeValue(value: unknown) {
  return String(value ?? "21:00").slice(0, 5);
}

function settingsFromRow(row: Record<string, unknown>): OfficialMonitorSettings {
  return {
    enabled: Boolean(row.enabled),
    scheduledTime: timeValue(row.scheduled_time),
    timezone: "Asia/Tokyo",
    lookaheadDays: Number(row.lookahead_days ?? 31),
    nextRunAt: row.next_run_at ? String(row.next_run_at) : null,
    lastStartedAt: row.last_started_at ? String(row.last_started_at) : null,
    lastSucceededAt: row.last_succeeded_at ? String(row.last_succeeded_at) : null,
    lastError: row.last_error ? String(row.last_error) : null,
    consecutiveFailures: Number(row.consecutive_failures ?? 0),
    discordConfigured: Boolean(row.discord_webhook_secret_id || process.env.DISCORD_WEBHOOK_URL),
    discordWebhookMasked: row.discord_webhook_masked ? String(row.discord_webhook_masked) : process.env.DISCORD_WEBHOOK_URL ? "環境変数で設定済み" : null,
    retentionDays: Number(row.retention_days ?? 45),
    maxStorageBytes: Number(row.max_storage_bytes ?? 157_286_400),
  };
}

export async function getOfficialMonitorSettings() {
  const { data, error } = await client().from("official_monitor_settings").select("*").eq("id", true).single();
  if (error) throw new Error(`監視設定を取得できませんでした: ${error.message}`);
  return settingsFromRow(data as Record<string, unknown>);
}

export async function updateOfficialMonitorSettings(input: {
  enabled: boolean;
  scheduledTime: string;
  lookaheadDays: number;
  retentionDays: number;
  maxStorageBytes: number;
  discordWebhookUrl?: string;
}) {
  const db = client();
  const { error } = await db.from("official_monitor_settings").update({
    enabled: input.enabled,
    scheduled_time: `${input.scheduledTime}:00`,
    timezone: "Asia/Tokyo",
    lookahead_days: input.lookaheadDays,
    retention_days: input.retentionDays,
    max_storage_bytes: input.maxStorageBytes,
    next_run_at: null,
  }).eq("id", true);
  if (error) throw new Error(`監視設定を更新できませんでした: ${error.message}`);
  if (input.discordWebhookUrl) {
    const { error: secretError } = await db.rpc("set_official_monitor_discord_webhook", { secret_value: input.discordWebhookUrl });
    if (secretError) throw new Error(`Discord WebhookをVaultへ保存できませんでした: ${secretError.message}`);
  }
  return getOfficialMonitorSettings();
}

export async function getDiscordWebhookUrl() {
  const fallback = process.env.DISCORD_WEBHOOK_URL?.trim() || null;
  const { data, error } = await client().rpc("get_official_monitor_discord_webhook");
  if (error) return fallback;
  return typeof data === "string" && data.trim() ? data.trim() : fallback;
}

function eventFromRow(row: Record<string, unknown>): MonitorEvent {
  return {
    id: String(row.id),
    sourceKey: String(row.source_key),
    entityKey: String(row.entity_key),
    eventType: String(row.event_type),
    summary: String(row.summary),
    importRunId: row.import_run_id ? String(row.import_run_id) : null,
    reviewStatus: row.review_status as MonitorEvent["reviewStatus"],
    diffCounts: (row.diff_counts ?? {}) as Record<string, number>,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: String(row.created_at),
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
  };
}

export async function listOfficialUpdateEvents(limit = 50) {
  const { data, error } = await client().from("official_update_events").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`更新履歴を取得できませんでした: ${error.message}`);
  return (data ?? []).map((row) => eventFromRow(row as Record<string, unknown>));
}

export async function getOfficialUpdateEvent(id: string) {
  const db = client();
  const [{ data: event, error }, { data: diffs, error: diffError }] = await Promise.all([
    db.from("official_update_events").select("*").eq("id", id).maybeSingle(),
    db.from("official_import_diffs").select("*").eq("event_id", id).order("entity_type").order("change_type"),
  ]);
  if (error) throw new Error(`更新履歴を取得できませんでした: ${error.message}`);
  if (diffError) throw new Error(`差分を取得できませんでした: ${diffError.message}`);
  if (!event) return null;
  return { event: eventFromRow(event as Record<string, unknown>), diffs: diffs ?? [] };
}

export async function getSourceStates() {
  const { data, error } = await client().from("official_source_states").select("*");
  if (error) throw new Error(`監視基準を取得できませんでした: ${error.message}`);
  return new Map((data ?? []).map((row) => {
    const state: SourceState = {
      sourceKey: row.source_key,
      entityKey: row.entity_key,
      sourceUrl: row.source_url,
      contentType: row.content_type,
      rawSha256: row.raw_sha256,
      normalizedSha256: row.normalized_sha256,
      documentDate: row.document_date || undefined,
      metadata: row.metadata ?? {},
      lastChangedAt: row.last_changed_at,
    };
    return [`${state.sourceKey}:${state.entityKey}`, state];
  }));
}

function extension(contentType: string) {
  if (contentType.includes("pdf")) return "pdf";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg")) return "jpg";
  if (contentType.includes("html")) return "html";
  return "json";
}

export async function saveSourceFingerprint(fingerprint: SourceFingerprint, changed: boolean, storeVersion: boolean) {
  const db = client();
  const now = new Date().toISOString();
  const { error } = await db.from("official_source_states").upsert({
    source_key: fingerprint.sourceKey,
    entity_key: fingerprint.entityKey,
    source_url: fingerprint.sourceUrl,
    content_type: fingerprint.contentType,
    raw_sha256: fingerprint.rawSha256,
    normalized_sha256: fingerprint.normalizedSha256,
    document_date: fingerprint.documentDate || null,
    metadata: fingerprint.metadata,
    last_checked_at: now,
    ...(changed ? { last_changed_at: now } : {}),
  }, { onConflict: "source_key,entity_key" });
  if (error) throw new Error(`監視基準を保存できませんでした: ${error.message}`);
  if (!changed || !storeVersion) return;

  const safeEntity = fingerprint.entityKey.replace(/[^a-zA-Z0-9_-]/g, "-");
  const path = `monitor/${fingerprint.sourceKey}/${safeEntity}/${fingerprint.rawSha256}.${extension(fingerprint.contentType)}`;
  let storagePath: string | null = path;
  const settings = await getOfficialMonitorSettings();
  const { data: storageUsage, error: storageUsageError } = await db.rpc("get_official_source_storage_usage");
  const currentBytes = storageUsageError
    ? settings.maxStorageBytes
    : Number(storageUsage || 0);
  if (currentBytes + fingerprint.bytes.byteLength <= settings.maxStorageBytes) {
    const { error: uploadError } = await db.storage.from("official-source-documents").upload(path, fingerprint.bytes, {
      contentType: fingerprint.contentType,
      upsert: true,
    });
    if (uploadError) storagePath = null;
  } else {
    storagePath = null;
  }
  const { error: versionError } = await db.from("official_source_versions").upsert({
    source_key: fingerprint.sourceKey,
    entity_key: fingerprint.entityKey,
    source_url: fingerprint.sourceUrl,
    content_type: fingerprint.contentType,
    raw_sha256: fingerprint.rawSha256,
    normalized_sha256: fingerprint.normalizedSha256,
    document_date: fingerprint.documentDate || null,
    storage_path: storagePath,
    byte_size: storagePath ? fingerprint.bytes.byteLength : 0,
    metadata: fingerprint.metadata,
  }, { onConflict: "source_key,entity_key,raw_sha256" });
  if (versionError) throw new Error(`公式原本の履歴を保存できませんでした: ${versionError.message}`);
}

export async function removeSourceState(sourceKey: string, entityKey: string) {
  const { error } = await client().from("official_source_states").delete().eq("source_key", sourceKey).eq("entity_key", entityKey);
  if (error) throw new Error(`削除された公式原本の監視基準を更新できませんでした: ${error.message}`);
}

export async function createUpdateEvent(input: {
  sourceKey: string;
  entityKey: string;
  eventType: string;
  summary: string;
  previousSha256?: string | null;
  currentSha256?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await client().from("official_update_events").insert({
    source_key: input.sourceKey,
    entity_key: input.entityKey,
    event_type: input.eventType,
    summary: input.summary,
    previous_sha256: input.previousSha256 || null,
    current_sha256: input.currentSha256 || null,
    metadata: input.metadata ?? {},
  }).select("*").single();
  if (error) throw new Error(`更新履歴を作成できませんでした: ${error.message}`);
  return eventFromRow(data as Record<string, unknown>);
}

export async function enqueueImportJob(eventId: string, payload: ImportJobPayload) {
  const dedupeKey = `${payload.date}:${payload.hashes.sort().join(":")}`;
  const { error } = await client().from("official_monitor_jobs").upsert({
    event_id: eventId,
    job_kind: "import-date",
    payload,
    dedupe_key: dedupeKey,
  }, { onConflict: "dedupe_key", ignoreDuplicates: true });
  if (error) throw new Error(`取込ジョブを登録できませんでした: ${error.message}`);
}

export async function claimNextImportJob() {
  const db = client();
  await db.from("official_monitor_jobs").update({ status: "pending", locked_until: null })
    .eq("status", "running").lt("locked_until", new Date().toISOString());
  const { data, error } = await db.from("official_monitor_jobs").select("*")
    .eq("status", "pending").lte("available_at", new Date().toISOString()).order("created_at").limit(1).maybeSingle();
  if (error) throw new Error(`取込ジョブを確認できませんでした: ${error.message}`);
  if (!data) return null;
  const lockedUntil = new Date(Date.now() + 10 * 60_000).toISOString();
  const { data: claimed, error: claimError } = await db.from("official_monitor_jobs").update({
    status: "running",
    attempts: Number(data.attempts || 0) + 1,
    locked_until: lockedUntil,
  }).eq("id", data.id).eq("status", "pending").select("*").maybeSingle();
  if (claimError) throw new Error(`取込ジョブを開始できませんでした: ${claimError.message}`);
  return claimed ? { id: String(claimed.id), eventId: String(claimed.event_id), payload: claimed.payload as ImportJobPayload, attempts: Number(claimed.attempts), maxAttempts: Number(claimed.max_attempts) } : null;
}

export async function pruneOfficialMonitorHistory(retentionDays: number) {
  const db = client();
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000).toISOString();
  const { data, error } = await db.from("official_source_versions")
    .select("id, source_key, entity_key, storage_path, detected_at")
    .order("detected_at", { ascending: false });
  if (error) throw new Error(`原本履歴を整理できませんでした: ${error.message}`);
  const counts = new Map<string, number>();
  const expired = (data ?? []).filter((row) => {
    const key = `${row.source_key}:${row.entity_key}`;
    const position = counts.get(key) ?? 0;
    counts.set(key, position + 1);
    return position >= 2 && String(row.detected_at) < cutoff;
  });
  const paths = expired.flatMap((row) => row.storage_path ? [String(row.storage_path)] : []);
  if (paths.length > 0) await db.storage.from("official-source-documents").remove(paths);
  const ids = expired.map((row) => String(row.id));
  if (ids.length > 0) await db.from("official_source_versions").delete().in("id", ids);
  await db.from("official_update_events").delete().neq("review_status", "pending").lt("created_at", cutoff);
  await db.from("official_source_states").delete().lt("document_date", cutoff.slice(0, 10));
}

export async function finishImportJob(id: string, errorMessage?: string, retry = false) {
  const update = errorMessage
    ? { status: retry ? "pending" : "failed", last_error: errorMessage, locked_until: null, available_at: new Date(Date.now() + 15 * 60_000).toISOString(), finished_at: retry ? null : new Date().toISOString() }
    : { status: "succeeded", last_error: null, locked_until: null, finished_at: new Date().toISOString() };
  const { error } = await client().from("official_monitor_jobs").update(update).eq("id", id);
  if (error) throw new Error(`取込ジョブの状態を更新できませんでした: ${error.message}`);
}

export async function getPublishedDataForDate(date: string): Promise<PublishedData> {
  const db = client();
  const [schedules, operations, operatingDays] = await Promise.all([
    db.from("schedule_items").select("*, schedule_characters(character_id, character_name)").eq("publication_status", "published").eq("event_date", date),
    db.from("attraction_operations").select("*").eq("publication_status", "published").eq("operation_date", date),
    db.from("park_operating_days").select("*").eq("publication_status", "published").eq("operation_date", date),
  ]);
  if (schedules.error || operations.error || operatingDays.error) throw new Error(`公開データを比較できませんでした: ${schedules.error?.message || operations.error?.message || operatingDays.error?.message}`);
  return { schedules: schedules.data ?? [], operations: operations.data ?? [], operatingDays: operatingDays.data ?? [] };
}

export async function getStoredImportData(runId: string): Promise<StoredImportData> {
  const db = client();
  const [schedules, operations, operatingDays] = await Promise.all([
    db.from("schedule_items").select("*, schedule_characters(character_id, character_name)").eq("import_run_id", runId),
    db.from("attraction_operations").select("*").eq("import_run_id", runId),
    db.from("park_operating_days").select("*").eq("import_run_id", runId),
  ]);
  if (schedules.error || operations.error || operatingDays.error) throw new Error(`取込候補を比較できませんでした: ${schedules.error?.message || operations.error?.message || operatingDays.error?.message}`);
  return { schedules: schedules.data ?? [], operations: operations.data ?? [], operatingDays: operatingDays.data ?? [] };
}

export async function attachImportDiffs(eventId: string, runId: string, diffs: SemanticDiff[], counts: Record<string, number>) {
  const db = client();
  if (diffs.length > 0) {
    const { error } = await db.from("official_import_diffs").insert(diffs.map((diff) => ({
      event_id: eventId,
      import_run_id: runId,
      entity_type: diff.entityType,
      change_type: diff.changeType,
      match_confidence: diff.matchConfidence,
      before_record_id: diff.beforeRecordId,
      after_record_id: diff.afterRecordId,
      before_data: diff.beforeData,
      after_data: diff.afterData,
      field_changes: diff.fieldChanges,
    })));
    if (error) throw new Error(`意味差分を保存できませんでした: ${error.message}`);
  }
  const { error } = await db.from("official_update_events").update({
    event_type: "import-ready",
    import_run_id: runId,
    diff_counts: counts,
    summary: "公式データの変更を取り込み、公開確認待ちにしました。",
  }).eq("id", eventId);
  if (error) throw new Error(`更新履歴へ取込結果を関連付けできませんでした: ${error.message}`);
}

export async function markImportEventFailed(eventId: string, errorMessage: string, retry: boolean) {
  const { error } = await client().from("official_update_events").update({
    event_type: "import-failed",
    summary: "公式データの自動取り込みに失敗しました。",
    metadata: { error: errorMessage, retry },
  }).eq("id", eventId);
  if (error) throw new Error(`取込失敗を更新履歴へ記録できませんでした: ${error.message}`);
}

export async function resolveOfficialUpdate(eventId: string, selectedDiffIds: string[]) {
  const { error } = await client().rpc("resolve_official_update", { target_event: eventId, selected_diff_ids: selectedDiffIds });
  if (error) throw new Error(`更新内容を反映できませんでした: ${error.message}`);
}

export async function markEventIgnored(eventId: string) {
  const db = client();
  const detail = await getOfficialUpdateEvent(eventId);
  if (detail?.event.importRunId) return resolveOfficialUpdate(eventId, []);
  const canIgnoreWithoutImport = detail?.event.eventType === "news"
    || (detail?.event.eventType === "import-failed" && detail.event.metadata.retry === false);
  if (!canIgnoreWithoutImport) throw new Error("自動取り込みが完了してから確認してください。");
  const { error } = await db.from("official_update_events").update({ review_status: "ignored", reviewed_at: new Date().toISOString() }).eq("id", eventId).eq("review_status", "pending");
  if (error) throw new Error(`更新履歴を無視済みにできませんでした: ${error.message}`);
}

export async function markMonitorStarted(nextRunAt: string) {
  const { error } = await client().from("official_monitor_settings").update({ last_started_at: new Date().toISOString(), next_run_at: nextRunAt }).eq("id", true);
  if (error) throw new Error(`監視開始時刻を記録できませんでした: ${error.message}`);
}

export async function markMonitorFinished(errorMessage?: string) {
  const db = client();
  const current = await getOfficialMonitorSettings();
  const { error } = await db.from("official_monitor_settings").update(errorMessage ? {
    last_error: errorMessage,
    consecutive_failures: current.consecutiveFailures + 1,
  } : {
    last_succeeded_at: new Date().toISOString(),
    last_error: null,
    consecutive_failures: 0,
  }).eq("id", true);
  if (error) throw new Error(`監視結果を記録できませんでした: ${error.message}`);
}

export async function recordNotification(eventId: string, result: { ok: boolean; providerId?: string; error?: string }) {
  const { error } = await client().from("official_notification_deliveries").upsert({
    event_id: eventId,
    channel: "discord",
    status: result.ok ? "sent" : "failed",
    attempts: 1,
    provider_id: result.providerId || null,
    last_error: result.error || null,
    sent_at: result.ok ? new Date().toISOString() : null,
  }, { onConflict: "event_id,channel" });
  if (error) throw new Error(`Discord通知結果を記録できませんでした: ${error.message}`);
}
