import { createHash, randomUUID } from "node:crypto";

export function sha256(value: Uint8Array | string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createRunId() {
  return randomUUID();
}

export function normalizeSpace(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u00a0\u3000]/g, " ")
    .replace(/[〜～]/g, "〜")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeTime(value: string) {
  const match = value.match(/(\d{1,2})\s*[:：]\s*(\d{2})/);
  if (!match) return undefined;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

export function buildExternalKey(parts: Array<string | undefined>) {
  return parts
    .filter((part): part is string => Boolean(part))
    .map((part) => normalizeSpace(part).toLocaleLowerCase("ja"))
    .join(":");
}

export function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
