import type { PublishedData, SemanticDiff, StoredImportData } from "@/lib/official-monitor/types";
import type { ImportPreview } from "@/lib/official-import/types";

type EntityKind = SemanticDiff["entityType"];

const fields: Record<EntityKind, string[]> = {
  schedule: ["title", "event_date", "end_date", "start_time", "end_time", "schedule_type", "location", "description", "official_url", "schedule_characters"],
  operation: ["operation_date", "attraction_name", "start_time", "end_time", "operation_status", "notes", "official_url"],
  "operating-day": ["operation_date", "operating_status", "opening_time", "closing_time", "source_title", "notes", "official_url"],
};

function normalizedText(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[・･]/g, "・")
    .toLowerCase();
}

function normalizedTime(value: unknown) {
  return String(value ?? "").slice(0, 5);
}

function comparable(row: Record<string, unknown>, field: string) {
  if (field === "schedule_characters") {
    const characters = Array.isArray(row[field]) ? row[field] as Array<Record<string, unknown>> : [];
    return characters.map((character) => normalizedText(character.character_name)).sort().join("|");
  }
  if (field.endsWith("_time")) return normalizedTime(row[field]);
  if (["title", "location", "description", "notes", "source_title", "attraction_name"].includes(field)) {
    return normalizedText(row[field]);
  }
  return row[field] ?? null;
}

function changes(kind: EntityKind, before: Record<string, unknown>, after: Record<string, unknown>) {
  return Object.fromEntries(fields[kind].flatMap((field) => {
    const beforeValue = comparable(before, field);
    const afterValue = comparable(after, field);
    return beforeValue === afterValue ? [] : [[field, { before: before[field] ?? null, after: after[field] ?? null }]];
  }));
}

function externalKey(row: Record<string, unknown>) {
  return String(row.external_key ?? "");
}

function entityDate(kind: EntityKind, row: Record<string, unknown>) {
  return String(row[kind === "schedule" ? "event_date" : "operation_date"] ?? "");
}

function stableKey(kind: EntityKind, row: Record<string, unknown>) {
  if (kind === "schedule") {
    return `${entityDate(kind, row)}|${normalizedText(row.title)}|${normalizedText(row.location)}`;
  }
  if (kind === "operation") return `${entityDate(kind, row)}|${normalizedText(row.attraction_name)}`;
  return entityDate(kind, row);
}

function diffCollection(
  kind: EntityKind,
  beforeRows: Array<Record<string, unknown>>,
  afterRows: Array<Record<string, unknown>>,
): SemanticDiff[] {
  const unmatchedBefore = new Set(beforeRows.map((_, index) => index));
  const results: SemanticDiff[] = [];

  for (const after of afterRows) {
    const exact = beforeRows.findIndex((before, index) => unmatchedBefore.has(index) && externalKey(before) === externalKey(after));
    const stableMatches = beforeRows
      .map((before, index) => ({ before, index }))
      .filter(({ before, index }) => unmatchedBefore.has(index) && stableKey(kind, before) === stableKey(kind, after));
    const index = exact >= 0 ? exact : stableMatches.length === 1 ? stableMatches[0].index : -1;

    if (exact < 0 && stableMatches.length > 1) {
      stableMatches.forEach(({ index: candidateIndex }) => unmatchedBefore.delete(candidateIndex));
      results.push({
        entityType: kind,
        changeType: "uncertain",
        matchConfidence: 0.4,
        beforeRecordId: null,
        afterRecordId: String(after.id ?? "") || null,
        beforeData: { candidates: stableMatches.map(({ before }) => before) },
        afterData: after,
        fieldChanges: {},
      });
      continue;
    }

    if (index < 0) {
      results.push({
        entityType: kind,
        changeType: "added",
        matchConfidence: 1,
        beforeRecordId: null,
        afterRecordId: String(after.id ?? "") || null,
        beforeData: null,
        afterData: after,
        fieldChanges: {},
      });
      continue;
    }

    unmatchedBefore.delete(index);
    const before = beforeRows[index];
    const fieldChanges = changes(kind, before, after);
    results.push({
      entityType: kind,
      changeType: Object.keys(fieldChanges).length ? "modified" : "unchanged",
      matchConfidence: exact >= 0 ? 1 : 0.85,
      beforeRecordId: String(before.id ?? "") || null,
      afterRecordId: String(after.id ?? "") || null,
      beforeData: before,
      afterData: after,
      fieldChanges,
    });
  }

  for (const index of unmatchedBefore) {
    const before = beforeRows[index];
    results.push({
      entityType: kind,
      changeType: "removed",
      matchConfidence: 1,
      beforeRecordId: String(before.id ?? "") || null,
      afterRecordId: null,
      beforeData: before,
      afterData: null,
      fieldChanges: {},
    });
  }
  return results;
}

export function createSemanticDiff(before: PublishedData, after: StoredImportData): SemanticDiff[] {
  return [
    ...diffCollection("schedule", before.schedules, after.schedules),
    ...diffCollection("operation", before.operations, after.operations),
    ...diffCollection("operating-day", before.operatingDays, after.operatingDays),
  ];
}

export function importPreviewData(preview: ImportPreview): StoredImportData {
  return {
    schedules: preview.schedules.map((entry) => ({
      external_key: entry.externalKey,
      source_id: entry.sourceId,
      title: entry.title,
      event_date: entry.date,
      end_date: entry.endDate ?? null,
      start_time: entry.startTime,
      end_time: entry.endTime ?? null,
      schedule_type: entry.scheduleType,
      location: entry.location,
      description: entry.description,
      official_url: entry.officialUrl,
      schedule_characters: entry.characters.map((character) => ({ character_name: character.name })),
    })),
    operations: preview.operations.map((entry) => ({
      external_key: entry.externalKey,
      source_id: entry.sourceId,
      operation_date: entry.date,
      attraction_name: entry.attractionName,
      start_time: entry.startTime ?? null,
      end_time: entry.endTime ?? null,
      operation_status: entry.operationStatus,
      notes: entry.notes,
      official_url: entry.officialUrl,
    })),
    operatingDays: preview.operatingDays.map((entry) => ({
      external_key: entry.externalKey,
      source_id: entry.sourceId,
      operation_date: entry.date,
      operating_status: entry.operatingStatus,
      opening_time: entry.openingTime ?? null,
      closing_time: entry.closingTime ?? null,
      source_title: entry.sourceTitle,
      notes: entry.notes,
      official_url: entry.officialUrl,
    })),
  };
}

export function meaningfulSemanticDiffs(diffs: SemanticDiff[]) {
  return diffs.filter((diff) => diff.changeType !== "unchanged");
}

export function countSemanticDiffs(diffs: SemanticDiff[]) {
  return diffs.reduce<Record<string, number>>((counts, diff) => {
    counts[diff.changeType] = (counts[diff.changeType] || 0) + 1;
    return counts;
  }, {});
}
