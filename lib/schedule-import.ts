export type ImportVerificationStatus = "verified" | "year-inferred" | "needs-review";

export type ImportedScheduleEntry = {
  id: string;
  kind: "greeting" | "event";
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  characterIds: string[];
  characterNames: string[];
  scheduleType: string;
  location: string;
  description: string;
  officialUrl: string;
  sourceName: string;
  sourceId: string;
  sourceReference: string;
  verificationStatus: ImportVerificationStatus;
  appearanceNotes: string[];
  updatedAt: string;
  status: "upcoming" | "completed";
  isSample: false;
  isImported: true;
};

export type ScheduleImportResult = {
  datasetId: string;
  generatedAt: string;
  entries: ImportedScheduleEntry[];
  warnings: string[];
};

type UnknownRecord = Record<string, unknown>;

const characterIdByName: Record<string, string> = {
  "マイメロディ": "my-melody",
  "クロミ": "kuromi",
  "シナモロール": "cinnamoroll",
  "ポムポムプリン": "pompompurin",
  "ハローキティ": "hello-kitty",
  "ディアダニエル": "daniel",
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(record: UnknownRecord, key: string, path: string) {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${path}.${key} は必須の文字列です。`);
  return value.trim();
}

function optionalString(record: UnknownRecord, key: string) {
  return typeof record[key] === "string" ? record[key].trim() : "";
}

export function parseScheduleImportDocument(input: unknown): ScheduleImportResult {
  if (!isRecord(input)) throw new Error("JSONのルートはオブジェクトである必要があります。");
  if (input.schemaVersion !== 1) throw new Error("schemaVersion は 1 を指定してください。");

  const datasetId = requiredString(input, "datasetId", "root");
  const generatedAt = requiredString(input, "generatedAt", "root");
  if (!Array.isArray(input.sources) || input.sources.length === 0) throw new Error("sources を1件以上指定してください。");
  if (!Array.isArray(input.schedules)) throw new Error("schedules は配列で指定してください。");

  const sourceMap = new Map<string, UnknownRecord>();
  input.sources.forEach((source, index) => {
    if (!isRecord(source)) throw new Error(`sources[${index}] はオブジェクトで指定してください。`);
    sourceMap.set(requiredString(source, "id", `sources[${index}]`), source);
  });

  const warnings: string[] = [];
  const ids = new Set<string>();
  const entries = input.schedules.map((schedule, index): ImportedScheduleEntry => {
    const path = `schedules[${index}]`;
    if (!isRecord(schedule)) throw new Error(`${path} はオブジェクトで指定してください。`);

    const externalId = requiredString(schedule, "externalId", path);
    if (ids.has(externalId)) throw new Error(`${path}.externalId が重複しています：${externalId}`);
    ids.add(externalId);

    const sourceId = requiredString(schedule, "sourceId", path);
    const source = sourceMap.get(sourceId);
    if (!source) throw new Error(`${path}.sourceId に対応する sources がありません：${sourceId}`);

    const kind = requiredString(schedule, "kind", path);
    if (kind !== "greeting" && kind !== "event") throw new Error(`${path}.kind は greeting または event を指定してください。`);

    const date = requiredString(schedule, "date", path);
    const startTime = requiredString(schedule, "startTime", path);
    const endTime = optionalString(schedule, "endTime");
    if (!datePattern.test(date)) throw new Error(`${path}.date は YYYY-MM-DD 形式で指定してください。`);
    if (!timePattern.test(startTime)) throw new Error(`${path}.startTime は HH:mm 形式で指定してください。`);
    if (endTime && !timePattern.test(endTime)) throw new Error(`${path}.endTime は HH:mm 形式で指定してください。`);
    if (endTime && endTime <= startTime) warnings.push(`${externalId}: 終了時間が開始時間以前です。`);

    const verificationStatus = optionalString(schedule, "verificationStatus") || "needs-review";
    if (!(["verified", "year-inferred", "needs-review"] as string[]).includes(verificationStatus)) {
      throw new Error(`${path}.verificationStatus の値が不正です。`);
    }

    const characters = Array.isArray(schedule.characters) ? schedule.characters : [];
    const characterNames: string[] = [];
    const appearanceNotes: string[] = [];
    characters.forEach((character, characterIndex) => {
      if (!isRecord(character)) throw new Error(`${path}.characters[${characterIndex}] はオブジェクトで指定してください。`);
      const name = requiredString(character, "name", `${path}.characters[${characterIndex}]`);
      characterNames.push(name);
      const appearanceNote = optionalString(character, "appearanceNote");
      if (appearanceNote) appearanceNotes.push(`${name}：${appearanceNote}`);
    });

    const notes = Array.isArray(schedule.notes) ? schedule.notes.filter((note): note is string => typeof note === "string" && note.trim() !== "") : [];
    const descriptionParts = [optionalString(schedule, "description"), ...notes, ...appearanceNotes].filter(Boolean);
    const retrievedAt = optionalString(source, "retrievedAt") || generatedAt;
    const retrievedDate = retrievedAt.slice(0, 10);

    return {
      id: `import:${datasetId}:${externalId}`,
      kind,
      title: requiredString(schedule, "title", path),
      date,
      startTime,
      endTime: endTime || undefined,
      characterIds: characterNames.map((name) => characterIdByName[name]).filter(Boolean),
      characterNames,
      scheduleType: requiredString(schedule, "scheduleType", path),
      location: requiredString(schedule, "location", path),
      description: descriptionParts.join(" "),
      officialUrl: optionalString(schedule, "officialUrl") || optionalString(source, "officialUrl"),
      sourceName: requiredString(source, "name", `source:${sourceId}`),
      sourceId,
      sourceReference: optionalString(schedule, "sourceReference"),
      verificationStatus: verificationStatus as ImportVerificationStatus,
      appearanceNotes,
      updatedAt: retrievedAt,
      status: date < retrievedDate ? "completed" : "upcoming",
      isSample: false,
      isImported: true,
    };
  });

  return { datasetId, generatedAt, entries, warnings };
}

export function parseScheduleImportJson(raw: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("JSONの構文が正しくありません。");
  }
  return parseScheduleImportDocument(parsed);
}
