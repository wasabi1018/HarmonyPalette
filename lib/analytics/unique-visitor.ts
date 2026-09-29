import { createHash } from "node:crypto";

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidDailyVisitorToken(value: unknown): value is string {
  return typeof value === "string" && UUID_V4_PATTERN.test(value);
}

export function currentJapanDate(value = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function hashDailyVisitorToken(visitorToken: string, visitDate: string) {
  return createHash("sha256")
    .update(`${visitDate}:${visitorToken}`, "utf8")
    .digest("hex");
}

export function shouldRecordDailyUniqueVisitor() {
  return process.env.NODE_ENV === "production"
    && (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production");
}
