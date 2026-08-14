import { createHash } from "node:crypto";
import type { ImportPreview, SourceDocument } from "@/lib/official-import/types";
import { getSupabaseAdminClient, getSupabaseReadClient } from "@/lib/supabase/server";

export type ScheduleDraftEdit = {
  externalKey: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  scheduleType: string;
  location: string;
  description: string;
  characterNames: string[];
};

export type PublishedScheduleEdit = {
  kind: "greeting" | "event";
  title: string;
  date: string;
  endDate?: string;
  startTime: string;
  endTime?: string;
  scheduleType: string;
  location: string;
  description: string;
  officialUrl: string;
  characters: Array<{ id?: string; name: string }>;
};

export type PublishedScheduleBulkReplacement = {
  field: "title" | "character";
  from: string;
  to: string;
};

export type OperationDraftEdit = {
  externalKey: string;
  attractionName: string;
  date: string;
  startTime?: string;
  endTime?: string;
  operationStatus: "scheduled" | "suspended" | "limited" | "unknown";
  notes: string;
};

export type ParkOperatingDayDraftEdit = {
  externalKey: string;
  date: string;
  operatingStatus: "open" | "closed" | "unknown";
  openingTime?: string;
  closingTime?: string;
  sourceTitle: string;
  notes: string;
};

type PublishedScheduleRow = {
  id: string;
  source_id: string;
  source_reference: string;
  kind: "greeting" | "event";
  title: string;
  event_date: string;
  end_date: string | null;
  start_time: string;
  end_time: string | null;
  schedule_type: string;
  location: string;
  description: string;
  official_url: string;
  updated_at: string;
  verification_status: string;
  schedule_characters: Array<{
    character_id: string | null;
    character_name: string;
  }>;
};

const PUBLISHED_SCHEDULE_PAGE_SIZE = 1000;

function storageExtension(document: SourceDocument) {
  if (document.contentType.includes("pdf")) return "pdf";
  if (document.contentType.includes("jpeg")) return "jpg";
  if (document.contentType.includes("png")) return "png";
  if (document.contentType.includes("json")) return "json";
  if (document.contentType.includes("html")) return "html";
  return "bin";
}

function compactTime(value?: string) {
  return value ? `${value}:00` : null;
}

type CatalogCharacter = {
  id?: string;
  name: string;
};

function importedCharacterId(name: string) {
  return `imported-${createHash("sha256").update(name).digest("hex").slice(0, 16)}`;
}

async function ensureCharacterCatalog(
  client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  candidates: CatalogCharacter[],
) {
  const uniqueCandidates = Array.from(
    new Map(
      candidates
        .map((character) => ({ ...character, name: character.name.trim() }))
        .filter((character) => character.name)
        .map((character) => [character.name, character]),
    ).values(),
  );

  const { data: existingCharacters, error: listError } = await client
    .from("characters")
    .select("id, name");
  if (listError) throw new Error(`キャラクター台帳を確認できませんでした: ${listError.message}`);

  const idByName = new Map(
    (existingCharacters ?? []).map((character) => [character.name as string, character.id as string]),
  );
  const missingRows = uniqueCandidates
    .filter((character) => !idByName.has(character.name))
    .map((character) => {
      const id = character.id?.trim() || importedCharacterId(character.name);
      return {
        id,
        slug: id,
        name: character.name,
        name_kana: "",
        image_url: "/character-placeholder.svg",
        official_url: "https://www.harmonyland.jp/",
        is_fan_studio_regular: false,
        theme_color: "#ef8099",
      };
    });

  if (missingRows.length > 0) {
    const { error: insertError } = await client
      .from("characters")
      .upsert(missingRows, { onConflict: "id" });
    if (insertError) throw new Error(`取込キャラクターを台帳へ登録できませんでした: ${insertError.message}`);
    missingRows.forEach((character) => idByName.set(character.name, character.id));
  }

  return idByName;
}

export async function persistImportPreview(preview: ImportPreview, triggerType: "manual" | "scheduled" | "cli" | "detected-update") {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabaseのサーバー用秘密鍵が設定されていません。");

  const { error: runError } = await client.from("import_runs").insert({
    id: preview.runId,
    source_id: "harmonyland-all",
    trigger_type: triggerType,
    range_start: preview.rangeStart,
    range_end: preview.rangeEnd,
    status: "running",
    warnings: preview.warnings,
    metadata: { importerVersion: 2 },
  });
  if (runError) throw new Error(`取込履歴を作成できませんでした: ${runError.message}`);

  try {
    const characterIdByName = await ensureCharacterCatalog(
      client,
      preview.schedules.flatMap((entry) => entry.characters),
    );
    const documentRows: Array<Record<string, unknown>> = [];
    for (const document of preview.documents) {
      const dateSegment = document.documentDate || "shared";
      const path = `${preview.runId}/${document.sourceId}/${dateSegment}/${document.sha256}.${storageExtension(document)}`;
      const { error: uploadError } = await client.storage
        .from("official-source-documents")
        .upload(path, document.bytes, { contentType: document.contentType, upsert: true });
      if (uploadError) throw new Error(`原本ファイルを保存できませんでした: ${uploadError.message}`);
      documentRows.push({
        import_run_id: preview.runId,
        source_id: document.sourceId,
        source_url: document.sourceUrl,
        document_date: document.documentDate || null,
        content_type: document.contentType,
        storage_path: path,
        sha256: document.sha256,
        byte_size: document.bytes.byteLength,
        parse_status: "parsed",
        metadata: document.metadata,
      });
    }

    if (documentRows.length > 0) {
      const { error } = await client.from("source_documents").insert(documentRows);
      if (error) throw new Error(`原本情報を登録できませんでした: ${error.message}`);
    }

    if (preview.schedules.length > 0) {
      const rows = preview.schedules.map((entry) => ({
        import_run_id: preview.runId,
        source_id: entry.sourceId,
        external_key: entry.externalKey,
        source_reference: entry.sourceReference,
        source_hash: entry.sourceHash,
        kind: entry.kind,
        title: entry.title,
        event_date: entry.date,
        end_date: entry.endDate || null,
        start_time: compactTime(entry.startTime),
        end_time: compactTime(entry.endTime),
        schedule_type: entry.scheduleType,
        location: entry.location,
        description: entry.description,
        official_url: entry.officialUrl,
        verification_status: entry.verificationStatus,
        confidence: entry.confidence,
        publication_status: "draft",
        raw_payload: entry.rawPayload,
      }));
      const { data, error } = await client.from("schedule_items").insert(rows).select("id, external_key");
      if (error) throw new Error(`予定候補を登録できませんでした: ${error.message}`);

      const idByKey = new Map((data ?? []).map((row) => [row.external_key as string, row.id as string]));
      const characterRows = preview.schedules.flatMap((entry) => {
        const scheduleId = idByKey.get(entry.externalKey);
        if (!scheduleId) return [];
        return entry.characters.map((character) => ({
          schedule_id: scheduleId,
          character_id: characterIdByName.get(character.name) || null,
          character_name: character.name,
        }));
      });
      if (characterRows.length > 0) {
        const { error: characterError } = await client.from("schedule_characters").insert(characterRows);
        if (characterError) throw new Error(`出演キャラクターを登録できませんでした: ${characterError.message}`);
      }
    }

    if (preview.operations.length > 0) {
      const rows = preview.operations.map((entry) => ({
        import_run_id: preview.runId,
        source_id: entry.sourceId,
        external_key: entry.externalKey,
        source_reference: entry.sourceReference,
        source_hash: entry.sourceHash,
        operation_date: entry.date,
        attraction_name: entry.attractionName,
        start_time: compactTime(entry.startTime),
        end_time: compactTime(entry.endTime),
        operation_status: entry.operationStatus,
        notes: entry.notes,
        official_url: entry.officialUrl,
        verification_status: entry.verificationStatus,
        confidence: entry.confidence,
        publication_status: "draft",
        raw_payload: entry.rawPayload,
      }));
      const { error } = await client.from("attraction_operations").insert(rows);
      if (error) throw new Error(`運行情報候補を登録できませんでした: ${error.message}`);
    }

    if (preview.operatingDays.length > 0) {
      const rows = preview.operatingDays.map((entry) => ({
        import_run_id: preview.runId,
        source_id: entry.sourceId,
        external_key: entry.externalKey,
        source_reference: entry.sourceReference,
        source_hash: entry.sourceHash,
        operation_date: entry.date,
        operating_status: entry.operatingStatus,
        opening_time: compactTime(entry.openingTime),
        closing_time: compactTime(entry.closingTime),
        source_title: entry.sourceTitle,
        notes: entry.notes,
        official_url: entry.officialUrl,
        verification_status: entry.verificationStatus,
        confidence: entry.confidence,
        publication_status: "draft",
        raw_payload: entry.rawPayload,
      }));
      const { error } = await client.from("park_operating_days").insert(rows);
      if (error) throw new Error(`営業情報候補を登録できませんでした: ${error.message}`);
    }

    const { error: finishError } = await client.from("import_runs").update({
      status: "succeeded",
      schedule_count: preview.schedules.length,
      operation_count: preview.operations.length,
      operating_day_count: preview.operatingDays.length,
      document_count: preview.documents.length,
      warnings: preview.warnings,
      finished_at: new Date().toISOString(),
    }).eq("id", preview.runId);
    if (finishError) throw new Error(`取込結果を更新できませんでした: ${finishError.message}`);
  } catch (error) {
    await client.from("import_runs").update({
      status: "failed",
      error_message: error instanceof Error ? error.message : String(error),
      finished_at: new Date().toISOString(),
    }).eq("id", preview.runId);
    throw error;
  }
}

export async function publishImportRun(
  runId: string,
  scheduleKeys?: string[],
  operationKeys?: string[],
  operatingDayKeys?: string[],
) {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabaseのサーバー用秘密鍵が設定されていません。");

  if (scheduleKeys) {
    const { data, error: listError } = await client.from("schedule_items").select("id, external_key").eq("import_run_id", runId).eq("publication_status", "draft");
    if (listError) throw new Error(`予定候補を確認できませんでした: ${listError.message}`);
    const selected = new Set(scheduleKeys);
    const excludedIds = (data ?? []).filter((row) => !selected.has(row.external_key as string)).map((row) => row.id as string);
    if (excludedIds.length > 0) {
      const { error } = await client.from("schedule_items").update({ publication_status: "withdrawn" }).in("id", excludedIds);
      if (error) throw new Error(`除外した予定候補を更新できませんでした: ${error.message}`);
    }
  }

  if (operationKeys) {
    const { data, error: listError } = await client.from("attraction_operations").select("id, external_key").eq("import_run_id", runId).eq("publication_status", "draft");
    if (listError) throw new Error(`運行情報候補を確認できませんでした: ${listError.message}`);
    const selected = new Set(operationKeys);
    const excludedIds = (data ?? []).filter((row) => !selected.has(row.external_key as string)).map((row) => row.id as string);
    if (excludedIds.length > 0) {
      const { error } = await client.from("attraction_operations").update({ publication_status: "withdrawn" }).in("id", excludedIds);
      if (error) throw new Error(`除外した運行情報候補を更新できませんでした: ${error.message}`);
    }
  }

  if (operatingDayKeys) {
    const { data, error: listError } = await client.from("park_operating_days").select("id, external_key").eq("import_run_id", runId).eq("publication_status", "draft");
    if (listError) throw new Error(`営業情報候補を確認できませんでした: ${listError.message}`);
    const selected = new Set(operatingDayKeys);
    const excludedIds = (data ?? []).filter((row) => !selected.has(row.external_key as string)).map((row) => row.id as string);
    if (excludedIds.length > 0) {
      const { error } = await client.from("park_operating_days").update({ publication_status: "withdrawn" }).in("id", excludedIds);
      if (error) throw new Error(`除外した営業情報候補を更新できませんでした: ${error.message}`);
    }
  }

  const { error } = await client.rpc("publish_import_run", { target_run: runId });
  if (error) throw new Error(`公開処理に失敗しました: ${error.message}`);
}

export async function updateImportDrafts(
  runId: string,
  scheduleEdits: ScheduleDraftEdit[],
  operationEdits: OperationDraftEdit[],
  operatingDayEdits: ParkOperatingDayDraftEdit[] = [],
) {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabaseのサーバー用秘密鍵が設定されていません。");

  const characterIdByName = await ensureCharacterCatalog(
    client,
    scheduleEdits.flatMap((edit) => edit.characterNames.map((name) => ({ name }))),
  );

  for (const edit of scheduleEdits) {
    const { data, error } = await client
      .from("schedule_items")
      .update({
        title: edit.title,
        event_date: edit.date,
        start_time: compactTime(edit.startTime),
        end_time: compactTime(edit.endTime),
        schedule_type: edit.scheduleType,
        location: edit.location,
        description: edit.description,
        verification_status: "verified",
      })
      .eq("import_run_id", runId)
      .eq("external_key", edit.externalKey)
      .eq("publication_status", "draft")
      .select("id")
      .maybeSingle();
    if (error) throw new Error(`確認待ち予定を更新できませんでした: ${error.message}`);
    if (!data?.id) throw new Error(`更新対象の確認待ち予定が見つかりません: ${edit.externalKey}`);

    const { error: deleteError } = await client.from("schedule_characters").delete().eq("schedule_id", data.id);
    if (deleteError) throw new Error(`出演キャラクターを更新できませんでした: ${deleteError.message}`);
    if (edit.characterNames.length > 0) {
      const { error: insertError } = await client.from("schedule_characters").insert(
        edit.characterNames.map((name) => ({
          schedule_id: data.id,
          character_id: characterIdByName.get(name) || null,
          character_name: name,
        })),
      );
      if (insertError) throw new Error(`出演キャラクターを登録できませんでした: ${insertError.message}`);
    }
  }

  for (const edit of operationEdits) {
    const { data, error } = await client
      .from("attraction_operations")
      .update({
        attraction_name: edit.attractionName,
        operation_date: edit.date,
        start_time: compactTime(edit.startTime),
        end_time: compactTime(edit.endTime),
        operation_status: edit.operationStatus,
        notes: edit.notes,
        verification_status: "verified",
      })
      .eq("import_run_id", runId)
      .eq("external_key", edit.externalKey)
      .eq("publication_status", "draft")
      .select("id")
      .maybeSingle();
    if (error) throw new Error(`確認待ち運行情報を更新できませんでした: ${error.message}`);
    if (!data?.id) throw new Error(`更新対象の確認待ち運行情報が見つかりません: ${edit.externalKey}`);
  }

  for (const edit of operatingDayEdits) {
    const isOpen = edit.operatingStatus === "open";
    const { data, error } = await client
      .from("park_operating_days")
      .update({
        operation_date: edit.date,
        operating_status: edit.operatingStatus,
        opening_time: isOpen ? compactTime(edit.openingTime) : null,
        closing_time: isOpen ? compactTime(edit.closingTime) : null,
        source_title: edit.sourceTitle,
        notes: edit.notes,
        verification_status: edit.operatingStatus === "unknown" ? "needs-review" : "verified",
      })
      .eq("import_run_id", runId)
      .eq("external_key", edit.externalKey)
      .eq("publication_status", "draft")
      .select("id")
      .maybeSingle();
    if (error) throw new Error(`確認待ち営業情報を更新できませんでした: ${error.message}`);
    if (!data?.id) throw new Error(`更新対象の確認待ち営業情報が見つかりません: ${edit.externalKey}`);
  }
}

export async function updatePublishedSchedule(id: string, edit: PublishedScheduleEdit) {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabaseのサーバー用秘密鍵が設定されていません。");

  const { data: updated, error: updateError } = await client
    .from("schedule_items")
    .update({
      kind: edit.kind,
      title: edit.title,
      event_date: edit.date,
      end_date: edit.kind === "event" ? edit.endDate || null : null,
      start_time: compactTime(edit.startTime),
      end_time: compactTime(edit.endTime),
      schedule_type: edit.scheduleType,
      location: edit.location,
      description: edit.description,
      official_url: edit.officialUrl,
      verification_status: "verified",
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (updateError) throw new Error(`予定を更新できませんでした: ${updateError.message}`);
  if (!updated?.id) throw new Error("編集対象の予定が見つかりません。");

  const { data: catalog, error: catalogError } = await client.from("characters").select("id, name");
  if (catalogError) throw new Error(`キャラクター台帳を確認できませんでした: ${catalogError.message}`);
  const knownIds = new Set((catalog ?? []).map((character) => String(character.id)));
  const idByName = new Map((catalog ?? []).map((character) => [String(character.name), String(character.id)]));
  const characters = Array.from(new Map(
    edit.characters.map((character) => [character.name, {
      id: character.id && knownIds.has(character.id) ? character.id : idByName.get(character.name),
      name: character.name,
    }]),
  ).values());

  const { error: deleteError } = await client.from("schedule_characters").delete().eq("schedule_id", id);
  if (deleteError) throw new Error(`出演キャラクターを更新できませんでした: ${deleteError.message}`);
  if (characters.length > 0) {
    const { error: insertError } = await client.from("schedule_characters").insert(
      characters.map((character) => ({
        schedule_id: id,
        character_id: character.id || null,
        character_name: character.name,
      })),
    );
    if (insertError) throw new Error(`出演キャラクターを登録できませんでした: ${insertError.message}`);
  }

  return updated;
}

export async function bulkReplacePublishedSchedules(replacement: PublishedScheduleBulkReplacement) {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabaseのサーバー用秘密鍵が設定されていません。");

  if (replacement.field === "title") {
    const { data, error } = await client
      .from("schedule_items")
      .update({
        title: replacement.to,
        verification_status: "verified",
      })
      .eq("publication_status", "published")
      .eq("title", replacement.from)
      .select("id");
    if (error) throw new Error(`予定名を一括置換できませんでした: ${error.message}`);
    return { updatedCount: data?.length ?? 0 };
  }

  const { data: matchingRows, error: matchingError } = await client
    .from("schedule_characters")
    .select("schedule_id")
    .eq("character_name", replacement.from);
  if (matchingError) throw new Error(`置換対象のキャラクターを確認できませんでした: ${matchingError.message}`);

  const matchingScheduleIds = Array.from(new Set(
    (matchingRows ?? []).map((row) => String(row.schedule_id)),
  ));
  if (matchingScheduleIds.length === 0) return { updatedCount: 0 };

  const { data: publishedRows, error: publishedError } = await client
    .from("schedule_items")
    .select("id")
    .eq("publication_status", "published")
    .in("id", matchingScheduleIds);
  if (publishedError) throw new Error(`公開予定を確認できませんでした: ${publishedError.message}`);

  const publishedScheduleIds = (publishedRows ?? []).map((row) => String(row.id));
  if (publishedScheduleIds.length === 0) return { updatedCount: 0 };

  const characterIdByName = await ensureCharacterCatalog(client, [{ name: replacement.to }]);
  const { data: destinationRows, error: destinationError } = await client
    .from("schedule_characters")
    .select("schedule_id")
    .in("schedule_id", publishedScheduleIds)
    .eq("character_name", replacement.to);
  if (destinationError) throw new Error(`置換先のキャラクターを確認できませんでした: ${destinationError.message}`);

  const duplicateScheduleIds = new Set(
    (destinationRows ?? []).map((row) => String(row.schedule_id)),
  );
  const scheduleIdsToUpdate = publishedScheduleIds.filter((id) => !duplicateScheduleIds.has(id));
  const scheduleIdsToDelete = publishedScheduleIds.filter((id) => duplicateScheduleIds.has(id));

  if (scheduleIdsToUpdate.length > 0) {
    const { error } = await client
      .from("schedule_characters")
      .update({
        character_name: replacement.to,
        character_id: characterIdByName.get(replacement.to) || null,
      })
      .in("schedule_id", scheduleIdsToUpdate)
      .eq("character_name", replacement.from);
    if (error) throw new Error(`キャラクター名を一括置換できませんでした: ${error.message}`);
  }

  if (scheduleIdsToDelete.length > 0) {
    const { error } = await client
      .from("schedule_characters")
      .delete()
      .in("schedule_id", scheduleIdsToDelete)
      .eq("character_name", replacement.from);
    if (error) throw new Error(`重複したキャラクター名を整理できませんでした: ${error.message}`);
  }

  const { error: verificationError } = await client
    .from("schedule_items")
    .update({ verification_status: "verified" })
    .in("id", publishedScheduleIds);
  if (verificationError) throw new Error(`置換した予定の確認状態を更新できませんでした: ${verificationError.message}`);

  return { updatedCount: publishedScheduleIds.length };
}

export async function getPublishedSchedules(from: string, to: string) {
  const client = getSupabaseReadClient();
  if (!client) return null;

  const rows: PublishedScheduleRow[] = [];
  let offset = 0;
  let totalCount: number | null = null;

  do {
    const { data, error, count } = await client
      .from("schedule_items")
      .select("*, schedule_characters(character_id, character_name)", { count: "exact" })
      .eq("publication_status", "published")
      .lte("event_date", to)
      .or(`and(end_date.is.null,event_date.gte.${from}),end_date.gte.${from}`)
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PUBLISHED_SCHEDULE_PAGE_SIZE - 1);
    if (error) throw new Error(error.message);

    const page = (data ?? []) as PublishedScheduleRow[];
    rows.push(...page);
    offset += page.length;
    totalCount = count;

    if (page.length === 0) break;
    if (totalCount === null && page.length < PUBLISHED_SCHEDULE_PAGE_SIZE) break;
  } while (totalCount === null || offset < totalCount);

  return rows;
}

export async function getPublishedOperations(date: string) {
  const client = getSupabaseReadClient();
  if (!client) return null;
  const { data, error } = await client
    .from("attraction_operations")
    .select("*")
    .eq("publication_status", "published")
    .eq("operation_date", date)
    .order("start_time", { ascending: true })
    .order("attraction_name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPublishedParkOperatingDays(from: string, to: string) {
  const client = getSupabaseReadClient();
  if (!client) return null;
  const { data, error } = await client
    .from("park_operating_days")
    .select("*")
    .eq("publication_status", "published")
    .eq("verification_status", "verified")
    .in("operating_status", ["open", "closed"])
    .gte("operation_date", from)
    .lte("operation_date", to)
    .order("operation_date", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}
