export type ImportSourceId = "harmonyland-calendar" | "harmonyland-funstudio";

export type PublicationStatus = "draft" | "published" | "withdrawn";
export type VerificationStatus = "verified" | "needs-review" | "parse-failed";

export type ImportedCharacter = {
  id?: string;
  name: string;
};

export type ImportedScheduleCandidate = {
  externalKey: string;
  sourceId: ImportSourceId;
  sourceReference: string;
  sourceHash: string;
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
  characters: ImportedCharacter[];
  verificationStatus: VerificationStatus;
  confidence: number;
  rawPayload: Record<string, unknown>;
};

export type AttractionOperationCandidate = {
  externalKey: string;
  sourceId: "harmonyland-calendar";
  sourceReference: string;
  sourceHash: string;
  date: string;
  attractionName: string;
  startTime?: string;
  endTime?: string;
  operationStatus: "scheduled" | "suspended" | "limited" | "unknown";
  notes: string;
  officialUrl: string;
  verificationStatus: VerificationStatus;
  confidence: number;
  rawPayload: Record<string, unknown>;
};

export type SourceDocument = {
  sourceId: ImportSourceId;
  sourceUrl: string;
  documentDate?: string;
  contentType: string;
  sha256: string;
  bytes: Uint8Array;
  metadata: Record<string, unknown>;
};

export type ImportPreview = {
  runId: string;
  generatedAt: string;
  rangeStart: string;
  rangeEnd: string;
  schedules: ImportedScheduleCandidate[];
  operations: AttractionOperationCandidate[];
  documents: SourceDocument[];
  warnings: string[];
};

