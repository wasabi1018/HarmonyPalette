import { extractPdfTextItems, groupPdfTextLines, type PdfTextLine } from "@/lib/official-import/pdf";
import type { AttractionOperationCandidate, ImportedCharacter, ImportedScheduleCandidate } from "@/lib/official-import/types";
import { buildExternalKey, normalizeSpace, normalizeTime, sha256 } from "@/lib/official-import/utils";

const TIME_RANGE = /(\d{1,2}\s*[:：]\s*\d{2})\s*[〜～~－-]\s*(\d{1,2}\s*[:：]\s*\d{2})/;
const KNOWN_LOCATIONS = [
  "ハーモニービレッジ",
  "プラザステージ",
  "ハーモニーパーク",
  "カーニバルスクエア",
  "ファンスタジオ",
  "キティキャッスル",
  "エントランス",
];

const CHARACTER_IDS: Record<string, string> = {
  "マイメロディ": "my-melody",
  "クロミ": "kuromi",
  "シナモロール": "cinnamoroll",
  "ポムポムプリン": "pompompurin",
  "ハローキティ": "hello-kitty",
  "ディアダニエル": "daniel",
};

const CHARACTER_NAMES = [
  "ウィッシュミーメル",
  "ポムポムプリン",
  "ディアダニエル",
  "シナモロール",
  "ハローキティ",
  "ハローミミィ",
  "マイメロディ",
  "けろけろけろっぴ",
  "リトルツインスターズ",
  "タキシードサム",
  "バッドばつ丸",
  "ハンギョドン",
  "ポチャッコ",
  "ぼんぼんりぼん",
  "クロミ",
  "ウサハナ",
  "メアリー",
  "ジョージ",
  "ルビー",
  "キキ",
  "ララ",
];

function findCharacters(lines: PdfTextLine[]): ImportedCharacter[] {
  const text = lines.map((line) => line.text).join(" ");
  return CHARACTER_NAMES
    .filter((name) => text.includes(name))
    .map((name) => ({ id: CHARACTER_IDS[name], name }));
}

function findLocation(lines: PdfTextLine[]) {
  return KNOWN_LOCATIONS.find((location) => lines.some((line) => line.text.includes(location))) || "場所は公式PDFを確認";
}

function cleanTitlePart(value: string, location: string) {
  let text = normalizeSpace(value)
    .replace(TIME_RANGE, "")
    .replace(/^[★☆]\s*/, "")
    .replace(location, "")
    .trim();
  if (text.startsWith("出演")) return "";
  if (/^(※|\[|席数|ショー開始|キッズエリア|数量限定)/.test(text)) return "";
  if (text === "★" || text === "☆") return "";
  const castIndex = text.indexOf("出演");
  if (castIndex >= 0) text = text.slice(0, castIndex).trim();
  return text;
}

function normalizeGreetingTitle(title: string) {
  return title.replace("おでむかえグリーティング", "お出迎えグリーティング");
}

function buildTitle(anchor: PdfTextLine, block: PdfTextLine[], location: string) {
  const anchorPart = cleanTitlePart(anchor.text, location);
  const candidates = block
    .filter((line) => line !== anchor)
    .map((line) => cleanTitlePart(line.text, location))
    .filter(Boolean)
    .filter((part) => !part.includes("キャラクターと並んでの撮影"))
    .filter((part) => !part.includes("お客様は、エリア"))
    .filter((part) => !part.includes("撮影が終わったら"));

  if (anchorPart) {
    const quoteIsOpen = anchorPart.includes("「") && !anchorPart.includes("」");
    if (quoteIsOpen) {
      const continuation = candidates.find((part) => part.includes("」"));
      return normalizeGreetingTitle(normalizeSpace(`${anchorPart}${continuation || ""}`));
    }
    return normalizeGreetingTitle(anchorPart);
  }

  const starred = block
    .map((line) => line.text.match(/^[★☆]\s*(.+)$/)?.[1])
    .find((value) => value && !value.startsWith("出演"));
  if (starred) return normalizeGreetingTitle(normalizeSpace(starred));

  return normalizeGreetingTitle(normalizeSpace(candidates.slice(0, 2).join(" "))) || "名称は公式PDFを確認";
}

function assignEventBlocks(lines: PdfTextLine[]) {
  const anchors = lines.filter((line) => TIME_RANGE.test(line.text)).sort((a, b) => b.y - a.y);
  return anchors.map((anchor, index) => {
    const nextAnchor = anchors[index + 1];
    const block = lines.filter((line) => line.y <= anchor.y && (!nextAnchor || line.y > nextAnchor.y));
    const titleLead = lines.filter((line) => (
      line.y > anchor.y
      && line.y <= anchor.y + 24
      && !TIME_RANGE.test(line.text)
      && !/^(※|出演|ショーの内容|また、)/.test(line.text)
    ));
    return { anchor, block: [...titleLead, ...block] };
  });
}

function parseEventSchedules(
  date: string,
  officialUrl: string,
  sourceHash: string,
  lines: PdfTextLine[],
): ImportedScheduleCandidate[] {
  const liveHeader = lines.find((line) => /ライブショー.*ステージイベント/.test(line.text));
  const attractionHeader = lines.find((line) => line.text === "アトラクション");
  if (!liveHeader || !attractionHeader) return [];

  const eventLines = lines.filter((line) => line.y < liveHeader.y && line.y > attractionHeader.y);
  return assignEventBlocks(eventLines).map(({ anchor, block }): ImportedScheduleCandidate => {
    const time = anchor.text.match(TIME_RANGE);
    const startTime = normalizeTime(time?.[1] || "") || "00:00";
    const endTime = normalizeTime(time?.[2] || "");
    const location = findLocation(block);
    const title = buildTitle(anchor, block, location);
    const greeting = title.includes("グリーティング");
    const scheduleType = greeting
      ? title.includes("お出迎え")
        ? "お出迎えグリーティング"
        : title.includes("はちゃめちゃ")
          ? "はちゃめちゃグリーティング"
          : "キャラクターグリーティング"
      : /parade|パレード/i.test(title)
        ? "ショー・パレード"
        : "ステージイベント";
    const notes = block.map((line) => line.text).filter((text) => text.startsWith("※"));
    const externalKey = buildExternalKey([date, startTime, title, location]);

    return {
      externalKey,
      sourceId: "harmonyland-calendar",
      sourceReference: officialUrl,
      sourceHash,
      kind: greeting ? "greeting" : "event",
      title,
      date,
      startTime,
      endTime,
      scheduleType,
      location,
      description: notes.join(" "),
      officialUrl,
      characters: findCharacters(block),
      verificationStatus: "needs-review",
      confidence: title === "名称は公式PDFを確認" || location === "場所は公式PDFを確認" ? 0.55 : 0.92,
      rawPayload: { lines: block.map((line) => line.text) },
    };
  }).filter((entry) => entry.startTime !== "00:00");
}

function normalizeAttractionName(value: string) {
  return normalizeSpace(value)
    .replace(/^[★☆]\s*/, "")
    .replace(/\s*NEW\s*$/i, "")
    .replace(/\s*[（(][^）)]*(?:円|台|回)[^）)]*[）)]\s*/g, " ")
    .trim();
}

function parseRainSensitiveNames(lines: PdfTextLine[], rainHeaderY: number) {
  const rainLine = lines
    .filter((line) => line.y < rainHeaderY && line.y > rainHeaderY - 28)
    .map((line) => line.text)
    .join(" ");
  return rainLine.split("★").map(normalizeAttractionName).filter(Boolean);
}

function parseAttractionOperations(
  date: string,
  officialUrl: string,
  sourceHash: string,
  lines: PdfTextLine[],
): AttractionOperationCandidate[] {
  const attractionHeader = lines.find((line) => line.text === "アトラクション");
  if (!attractionHeader) return [];
  const rainHeader = lines.find((line) => line.text.includes("雨天時運休するアトラクション"));
  const lowerY = rainHeader?.y ?? 0;
  const operationLines = lines.filter((line) => line.y < attractionHeader.y && line.y > lowerY);
  const rainSensitive = rainHeader ? parseRainSensitiveNames(lines, rainHeader.y) : [];

  return operationLines.flatMap((line) => {
    const match = line.text.match(TIME_RANGE);
    if (!match) return [];
    const beforeTime = line.text.slice(0, match.index).trim();
    if (beforeTime.includes("キャラクターグリーティング") || beforeTime.includes("ファンスタジオ")) return [];
    const attractionName = normalizeAttractionName(beforeTime);
    if (!attractionName) return [];
    const startTime = normalizeTime(match[1]);
    const endTime = normalizeTime(match[2]);
    const isRainSensitive = rainSensitive.some((name) => attractionName.includes(name) || name.includes(attractionName));
    const notes = [
      isRainSensitive ? "雨天時運休" : "",
      /[（(].*(?:円|台|回).*[）)]/.test(beforeTime) ? beforeTime.match(/[（(].*[）)]/)?.[0] || "" : "",
      /\bNEW\b/i.test(beforeTime) ? "NEW" : "",
    ].filter(Boolean).join("・");
    const externalKey = buildExternalKey([date, attractionName]);
    return [{
      externalKey,
      sourceId: "harmonyland-calendar" as const,
      sourceReference: officialUrl,
      sourceHash,
      date,
      attractionName,
      startTime,
      endTime,
      operationStatus: "scheduled" as const,
      notes,
      officialUrl,
      verificationStatus: "needs-review" as const,
      confidence: 0.97,
      rawPayload: { line: line.text },
    }];
  });
}

export async function parseHarmonylandDailyPdf(date: string, officialUrl: string, bytes: Uint8Array) {
  const sourceHash = sha256(bytes);
  const items = await extractPdfTextItems(bytes);
  const lines = groupPdfTextLines(items);
  return {
    schedules: parseEventSchedules(date, officialUrl, sourceHash, lines),
    operations: parseAttractionOperations(date, officialUrl, sourceHash, lines),
    lines,
  };
}
