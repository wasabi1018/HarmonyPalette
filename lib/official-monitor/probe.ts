import { createHash } from "node:crypto";
import { addDays } from "@/lib/official-import/utils";
import type { SourceFingerprint } from "@/lib/official-monitor/types";
import { SITE_URL } from "@/lib/site-config";

const CALENDAR_API = "https://www.harmonyland.jp/wp/?mc-api=json";
const FUN_STUDIO_URL = "https://www.harmonyland.jp/sp/funstudio/c_schedule.html";
const NEWS_URL = "https://www.harmonyland.jp/news/";
const USER_AGENT = `HarmonyPaletteMonitor/1.0 (+${SITE_URL})`;

function hash(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableValue(entry)]));
  }
  return typeof value === "string" ? value.normalize("NFKC").replace(/\s+/g, " ").trim() : value;
}

function encoded(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(stableValue(value)));
}

async function fetchBytes(url: string) {
  const response = await fetch(url, { headers: { "user-agent": USER_AGENT }, cache: "no-store" });
  if (!response.ok) throw new Error(`${url} の取得に失敗しました（HTTP ${response.status}）`);
  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") || "application/octet-stream",
  };
}

function dateRange(from: string, to: string) {
  const dates: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) dates.push(date);
  return dates;
}

function extractNews(html: string) {
  const entries: Array<{ title: string; url: string }> = [];
  const linkPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(linkPattern)) {
    const url = new URL(match[1], NEWS_URL).toString();
    if (!url.startsWith("https://www.harmonyland.jp/") || !/\/(news|topics)\//i.test(url)) continue;
    const title = match[2].replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
    if (title) entries.push({ title, url });
  }
  return Array.from(new Map(entries.map((entry) => [entry.url, entry])).values())
    .sort((left, right) => left.url.localeCompare(right.url));
}

export async function probeOfficialSources(from: string, to: string): Promise<SourceFingerprint[]> {
  const fingerprints: SourceFingerprint[] = [];
  const dates = dateRange(from, to);
  const apiUrl = `${CALENDAR_API}&from=${from}&to=${to}`;
  const calendarResponse = await fetch(apiUrl, { headers: { "user-agent": USER_AGENT }, cache: "no-store" });
  if (!calendarResponse.ok) throw new Error(`公式カレンダーの取得に失敗しました（HTTP ${calendarResponse.status}）`);
  const calendar = await calendarResponse.json() as Record<string, Array<Record<string, unknown>>>;

  for (const date of dates) {
    const records = calendar[date] ?? [];
    const bytes = encoded(records);
    fingerprints.push({
      sourceKey: "calendar",
      entityKey: date,
      sourceUrl: apiUrl,
      contentType: "application/json",
      rawSha256: hash(bytes),
      normalizedSha256: hash(bytes),
      documentDate: date,
      bytes,
      metadata: { role: "calendar-day", recordCount: records.length },
    });

    const pdf = records.find((record) => typeof record.event_link === "string" && record.event_link.toLowerCase().includes(".pdf"));
    if (typeof pdf?.event_link !== "string") continue;
    const document = await fetchBytes(pdf.event_link);
    fingerprints.push({
      sourceKey: "daily-pdf",
      entityKey: date,
      sourceUrl: pdf.event_link,
      contentType: document.contentType,
      rawSha256: hash(document.bytes),
      normalizedSha256: hash(document.bytes),
      documentDate: date,
      bytes: document.bytes,
      metadata: { role: "daily-schedule", title: pdf.event_title ?? "" },
    });
  }

  const fanIndex = await fetchBytes(FUN_STUDIO_URL);
  const fanHtml = new TextDecoder().decode(fanIndex.bytes);
  const datesByMonthDay = new Map(dates.map((date) => [date.slice(5).replace("-", ""), date]));
  const fanPattern = /id=["']statusPup([a-z]+)(\d{4})["'][\s\S]{0,1200}?<img[^>]+src=["']([^"']+)["']/gi;
  for (const match of fanHtml.matchAll(fanPattern)) {
    const date = datesByMonthDay.get(match[2]);
    if (!date) continue;
    const prefix = match[1].slice(0, 1);
    const url = new URL(match[3], FUN_STUDIO_URL).toString();
    const document = await fetchBytes(url);
    fingerprints.push({
      sourceKey: "funstudio",
      entityKey: `${date}:${prefix}`,
      sourceUrl: url,
      contentType: document.contentType,
      rawSha256: hash(document.bytes),
      normalizedSha256: hash(document.bytes),
      documentDate: date,
      bytes: document.bytes,
      metadata: { role: "fanstudio-schedule", prefix },
    });
  }

  const newsDocument = await fetchBytes(NEWS_URL);
  const newsEntries = extractNews(new TextDecoder().decode(newsDocument.bytes));
  const newsBytes = encoded(newsEntries);
  fingerprints.push({
    sourceKey: "news",
    entityKey: "index",
    sourceUrl: NEWS_URL,
    contentType: "application/json",
    rawSha256: hash(newsDocument.bytes),
    normalizedSha256: hash(newsBytes),
    bytes: newsBytes,
    metadata: { role: "news-index", entries: newsEntries.slice(0, 20) },
  });

  return fingerprints;
}
