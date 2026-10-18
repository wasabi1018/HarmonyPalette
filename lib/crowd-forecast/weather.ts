import { parseDocument } from "htmlparser2";
import type { AnyNode, Element } from "domhandler";
import { japanDay } from "./model";
import type { Weather, WeatherKind } from "./types";

function elements(node: AnyNode): Element[] {
  return "children" in node
    ? node.children.filter((n): n is Element => n.type === "tag")
    : [];
}
function local(node: Element) {
  return node.name.split(":").at(-1);
}
function children(node: AnyNode, name: string) {
  return elements(node).filter((n) => local(n) === name);
}
function descendants(node: AnyNode, name: string): Element[] {
  return elements(node).flatMap((n) => [
    ...(local(n) === name ? [n] : []),
    ...descendants(n, name),
  ]);
}
function text(node?: AnyNode): string {
  return !node
    ? ""
    : node.type === "text"
      ? node.data
      : "children" in node
        ? node.children.map((n) => text(n)).join("")
        : "";
}
function value(node: AnyNode, name: string) {
  return text(children(node, name)[0]);
}
export function classifyWeather(text: string): WeatherKind {
  const s = text.replace(/[\s　]/g, "");
  // A probability and an isolated heavy shower cannot establish prolonged daytime heavy rain.
  if (!/[雨雪]/.test(s)) return /晴/.test(s) ? "clear" : "cloud";
  if (/^(雨|雪)/.test(s)) return "rain";
  return /一時|時々/.test(s) ? "occasionalRain" : "mixedRain";
}
export function bulletinUrls(feed: string) {
  const doc = parseDocument(feed, { xmlMode: true });
  return ["VPFW50", "VPFD51"].flatMap((code) => {
    const entries = descendants(doc, "entry")
      .map((e) => ({ url: value(e, "id"), at: value(e, "updated") }))
      .filter((e) =>
        new RegExp(
          `^https://www\\.data\\.jma\\.go\\.jp/developer/xml/data/[A-Za-z0-9_]+_${code}_440000\\.xml$`,
        ).test(e.url),
      )
      .sort(
        (a, b) =>
          Date.parse(b.at) - Date.parse(a.at) || b.url.localeCompare(a.url),
      );
    return entries[0] ? [entries[0].url] : [];
  });
}
export function parseBulletin(
  xml: string,
  sourceUrl: string,
  fetchedAt: string,
): Weather[] {
  const doc = parseDocument(xml, { xmlMode: true });
  const control = descendants(doc, "Control")[0],
    head = descendants(doc, "Head")[0];
  if (
    !control ||
    !head ||
    value(control, "Status") !== "通常" ||
    !value(head, "Title").includes("大分") ||
    !["発表", "訂正"].includes(value(head, "InfoType"))
  )
    return [];
  const issuedAt = value(head, "ReportDateTime");
  if (!Number.isFinite(Date.parse(issuedAt)))
    throw new Error("予報発表日時を確認できません。");
  const result = new Map<string, Weather>();
  const get = (date: string) => {
    if (!result.has(date))
      result.set(date, {
        date,
        text: "",
        kind: "cloud",
        region: sourceUrl.includes("VPFW50") ? "大分県" : "大分県 中部",
        station: "大分",
        high: null,
        low: null,
        rain: [],
        dailyRain: null,
        issuedAt,
        fetchedAt,
        validUntil: new Date(Date.parse(issuedAt) + 36 * 3600000).toISOString(),
        sourceUrl,
      });
    return result.get(date)!;
  };
  for (const group of descendants(doc, "MeteorologicalInfos")) {
    if (!["区域予報", "地点予報"].includes(group.attribs.type)) continue;
    for (const series of children(group, "TimeSeriesInfo")) {
      const times = new Map(
        descendants(
          children(series, "TimeDefines")[0] ?? series,
          "TimeDefine",
        ).map((t) => [t.attribs.timeId, value(t, "DateTime")]),
      );
      for (const item of children(series, "Item")) {
        const area = children(item, "Area")[0],
          station = children(item, "Station")[0];
        if (
          !(area && ["440010", "440000"].includes(value(area, "Code"))) &&
          !(station && value(station, "Code") === "83216")
        )
          continue;
        for (const property of descendants(item, "Property")) {
          const type = value(property, "Type");
          if (type === "天気")
            for (const part of children(property, "WeatherPart"))
              for (const w of children(part, "Weather")) {
                const at = times.get(w.attribs.refID);
                if (!at) continue;
                const record = get(japanDay(new Date(at)));
                record.text = text(w);
                record.kind = classifyWeather(record.text);
              }
          if (type === "降水確率")
            for (const n of descendants(
              property,
              "ProbabilityOfPrecipitation",
            )) {
              const at = times.get(n.attribs.refID),
                raw = text(n).trim();
              if (
                !at ||
                !raw ||
                !Number.isFinite(Number(raw)) ||
                Number(raw) < 0 ||
                Number(raw) > 100
              )
                continue;
              const record = get(japanDay(new Date(at)));
              if (n.attribs.type === "日降水確率")
                record.dailyRain = Number(raw);
              else if (n.attribs.type === "６時間降水確率") {
                const from = Number(
                  new Intl.DateTimeFormat("en-GB", {
                    timeZone: "Asia/Tokyo",
                    hour: "2-digit",
                    hourCycle: "h23",
                  }).format(new Date(at)),
                );
                record.rain.push({
                  from,
                  to: from + 6,
                  probability: Number(raw),
                });
              }
            }
          if (
            ["最高気温", "日中の最高気温", "最低気温", "朝の最低気温"].includes(
              type,
            )
          )
            for (const n of descendants(property, "Temperature")) {
              const at = times.get(n.attribs.refID),
                raw = text(n).trim();
              if (!at || !raw || !Number.isFinite(Number(raw))) continue;
              const record = get(japanDay(new Date(at)));
              if (type.includes("最高")) record.high = Number(raw);
              else record.low = Number(raw);
            }
        }
      }
    }
  }
  return [...result.values()]
    .filter((w) => w.text)
    .map((w) => ({ ...w, rain: w.rain.sort((a, b) => a.from - b.from) }));
}
export function mergeWeather(cache: Record<string, Weather[]>, urls: string[]) {
  const days: Record<string, Weather> = {};
  // Weekly first; the short-term bulletin takes priority while retaining unavailable fields.
  for (const url of [...urls].sort(
    (a, b) => Number(a.includes("VPFD51")) - Number(b.includes("VPFD51")),
  ))
    for (const w of cache[url] ?? []) {
      const old = days[w.date];
      days[w.date] = {
        ...w,
        high: w.high ?? old?.high ?? null,
        low: w.low ?? old?.low ?? null,
        dailyRain: w.dailyRain ?? old?.dailyRain ?? null,
        rain: w.rain.length ? w.rain : (old?.rain ?? []),
      };
    }
  return days;
}
async function download(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(18000),
    headers: { "User-Agent": "HarmonyPalette-Weather/1.0" },
  });
  if (!response.ok)
    throw new Error(`気象庁データの取得に失敗しました (${response.status})。`);
  const text = await response.text();
  if (text.length > 15000000) throw new Error("予報データが上限を超えました。");
  return text;
}
/** Called only by the authenticated once-daily worker, never by a public reader. */
export async function fetchJma(cache: Record<string, Weather[]>, now: Date) {
  const next = { ...cache },
    urls = bulletinUrls(
      await download(
        "https://www.data.jma.go.jp/developer/xml/feed/regular_l.xml",
      ),
    );
  if (urls.length !== 2)
    throw new Error("大分県の最新予報がそろっていません。");
  for (const url of urls)
    if (!(url in next))
      next[url] = parseBulletin(await download(url), url, now.toISOString());
  return {
    cache: Object.fromEntries(urls.map((url) => [url, next[url]])),
    days: mergeWeather(next, urls),
  };
}
