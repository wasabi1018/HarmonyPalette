import type { ImportPreview, ImportedScheduleCandidate, SourceDocument } from "@/lib/official-import/types";
import { buildExternalKey, normalizeSpace, normalizeTime, sha256 } from "@/lib/official-import/utils";

const FUN_STUDIO_URL = "https://www.harmonyland.jp/sp/funstudio/c_schedule.html";
const USER_AGENT = "HarmonyPaletteImporter/0.1 (+https://harmony-palette.example)";
const TIME_RANGE = /(\d{1,2}\s*[:：]\s*\d{2})\s*[〜～~－-]\s*(\d{1,2}\s*[:：]\s*\d{2})/;

const ROOMS: Record<string, string> = {
  g: "ファンスタジオ101号室",
  p: "ファンスタジオ102号室",
  s: "ファンスタジオ103号室",
};

const CHARACTER_ALIASES: Array<[RegExp, string, string | undefined]> = [
  [/マイ\s*メロディ|マイメロディ/, "マイメロディ", "my-melody"],
  [/クロミ/, "クロミ", "kuromi"],
  [/シナモ(?:ロール)?/, "シナモロール", "cinnamoroll"],
  [/ポムポム\s*プリン|ポムポムプリン/, "ポムポムプリン", "pompompurin"],
  [/ハロー\s*キティ|ハローキティ/, "ハローキティ", "hello-kitty"],
  [/ディア\s*ダニエル|ディアダニエル/, "ディアダニエル", "daniel"],
  [/ウサハナ/, "ウサハナ", undefined],
  [/あひる\s*の?\s*ペックル|あひるのペックル/, "あひるのペックル", undefined],
  [/ウィッシュ\s*ミー\s*メル|ウィッシュミーメル/, "ウィッシュミーメル", undefined],
  [/コロコロ\s*[グク]リリン|コロコロクリリン/, "コロコロクリリン", undefined],
  [/ハンギョドン/, "ハンギョドン", undefined],
  [/ポチャッコ/, "ポチャッコ", undefined],
  [/バッド\s*ばつ丸|バッドばつ丸/, "バッドばつ丸", undefined],
  [/モップ/, "モップ", undefined],
];

type FanStudioImage = { prefix: string; monthDay: string; url: string };

type DetectedImageRow = {
  top: number;
  bottom: number;
  hasIcon: boolean;
};

type ParsedRowTime = {
  startTime: string;
  endTime: string;
};

function groupConsecutive(values: number[]) {
  const groups: Array<[number, number]> = [];
  for (const value of values) {
    const last = groups.at(-1);
    if (!last || value > last[1] + 1) groups.push([value, value]);
    else last[1] = value;
  }
  return groups;
}

function rowHasIcon(raw: Buffer, width: number, channels: number, top: number, bottom: number) {
  const left = Math.round(width * 0.82);
  const right = Math.round(width * 0.98);
  const yStart = Math.min(bottom, top + 8);
  const yEnd = Math.max(yStart, bottom - 8);
  let nonWhite = 0;
  let total = 0;
  for (let y = yStart; y < yEnd; y += 1) {
    for (let x = left; x < right; x += 1) {
      const index = (y * width + x) * channels;
      const red = raw[index];
      const green = raw[index + 1];
      const blue = raw[index + 2];
      if (red < 242 || green < 242 || blue < 242) nonWhite += 1;
      total += 1;
    }
  }
  return total > 0 && nonWhite / total > 0.12;
}

function detectImageRows(raw: Buffer, width: number, height: number, channels: number): DetectedImageRow[] {
  const saturatedLines: number[] = [];
  for (let y = 0; y < height; y += 1) {
    let saturated = 0;
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * channels;
      const red = raw[index];
      const green = raw[index + 1];
      const blue = raw[index + 2];
      const maximum = Math.max(red, green, blue);
      const minimum = Math.min(red, green, blue);
      if (maximum > 150 && maximum - minimum > 30) saturated += 1;
    }
    if (saturated > width * 0.55) saturatedLines.push(y);
  }

  const groups = groupConsecutive(saturatedLines);
  const header = groups.find(([start, end]) => end - start >= 20);
  if (!header) return [];
  const separators = groups.filter(([start, end]) => start > header[1] + 20 && end - start <= 8);
  const rows: DetectedImageRow[] = [];
  let top = header[1] + 1;
  for (const [start, end] of separators) {
    const bottom = start - 1;
    if (bottom - top >= 30) rows.push({ top, bottom, hasIcon: rowHasIcon(raw, width, channels, top, bottom) });
    top = end + 1;
  }
  return rows;
}

function parseSingleTimeRange(raw: string): ParsedRowTime | null {
  const normalized = raw.normalize("NFKC").replace(/[Oo]/g, "0");
  const matches = Array.from(normalized.matchAll(/(\d{1,2})\s*[:.]?\s*([0-5]\d)/g));
  if (matches.length < 2) return null;
  const values = matches.slice(0, 2).map((match) => {
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    return hour <= 23 ? `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` : null;
  });
  if (!values[0] || !values[1] || values[0] >= values[1]) return null;
  return { startTime: values[0], endTime: values[1] };
}

function shiftTime(value: string, minutes: number) {
  const [hour, minute] = value.split(":").map(Number);
  const total = hour * 60 + minute + minutes;
  if (total < 0 || total >= 24 * 60) return null;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function fillMissingTimes(values: Array<ParsedRowTime | null>) {
  const completed = [...values];
  for (let pass = 0; pass < completed.length; pass += 1) {
    let changed = false;
    for (let index = 0; index < completed.length; index += 1) {
      if (completed[index]) continue;
      const previous = completed[index - 1];
      const next = completed[index + 1];
      if (previous) {
        const endTime = shiftTime(previous.endTime, 30);
        if (endTime) {
          completed[index] = { startTime: previous.endTime, endTime };
          changed = true;
        }
      } else if (next) {
        const startTime = shiftTime(next.startTime, -30);
        if (startTime) {
          completed[index] = { startTime, endTime: next.startTime };
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  return completed;
}

function dateRange(from: string, to: string) {
  const dates: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function discoverImages(html: string): FanStudioImage[] {
  const images: FanStudioImage[] = [];
  const pattern = /id=["']statusPup([a-z]+)(\d{4})["'][\s\S]{0,1200}?<img[^>]+src=["']([^"']+)["']/gi;
  for (const match of html.matchAll(pattern)) {
    images.push({ prefix: match[1].slice(0, 1), monthDay: match[2], url: new URL(match[3], FUN_STUDIO_URL).toString() });
  }
  return images;
}

function canonicalCharacter(raw: string) {
  for (const [pattern, name, id] of CHARACTER_ALIASES) {
    if (pattern.test(raw)) return { name, id };
  }
  const name = normalizeSpace(raw)
    .replace(/[※★☆●○◎]/g, "")
    .replace(/[^ぁ-んァ-ヶ一-龠ーA-Za-z・]/g, " ")
    .trim();
  return name ? { name } : null;
}

function parseOcrRows(text: string) {
  const normalized = text
    .normalize("NFKC")
    .replace(/[Oo〇○]/g, "0")
    .replace(/(\d{1,2})\s*[:：]?\s*0{3}(?!\d)/g, "$1:00")
    .replace(/(\d{1,2})\s*[:：]?\s*([0-5]\d)(?!\d)/g, "$1:$2")
    .replace(/(?:\.\.\.|…|~|〜|～|へ)+/g, "〜")
    .replace(/\s+/g, " ")
    .trim();
  const rows: Array<{ startTime: string; endTime: string; rawName: string }> = [];
  const matches = Array.from(normalized.matchAll(new RegExp(TIME_RANGE.source, "g")));
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const startTime = normalizeTime(match[1]);
    const endTime = normalizeTime(match[2]);
    if (!startTime || !endTime || startTime < "08:00" || startTime >= endTime) continue;
    const start = (match.index || 0) + match[0].length;
    const end = matches[index + 1]?.index ?? normalized.length;
    const rawName = normalized.slice(start, end).trim();
    rows.push({ startTime, endTime, rawName });
  }
  return rows;
}

export async function importFanStudioSchedules(
  from: string,
  to: string,
  onProgress?: (message: string) => void,
): Promise<Pick<ImportPreview, "schedules" | "documents" | "warnings">> {
  const response = await fetch(FUN_STUDIO_URL, { headers: { "user-agent": USER_AGENT }, cache: "no-store" });
  if (!response.ok) throw new Error(`ファンスタジオページの取得に失敗しました: ${response.status}`);
  const html = await response.text();
  const htmlBytes = new TextEncoder().encode(html);
  const documents: SourceDocument[] = [{
    sourceId: "harmonyland-funstudio",
    sourceUrl: FUN_STUDIO_URL,
    contentType: "text/html",
    sha256: sha256(htmlBytes),
    bytes: htmlBytes,
    metadata: { role: "schedule-index" },
  }];
  const warnings: string[] = [];
  const schedules: ImportedScheduleCandidate[] = [];
  const dates = dateRange(from, to);
  const datesByMonthDay = new Map(dates.map((date) => [date.slice(5).replace("-", ""), date]));
  const targets = discoverImages(html).filter((image) => datesByMonthDay.has(image.monthDay));
  if (targets.length === 0) {
    warnings.push("指定期間のファンスタジオ予定表画像が見つかりませんでした。");
    return { schedules, documents, warnings };
  }

  const [{ createWorker, OEM, PSM }, sharpModule] = await Promise.all([
    import("tesseract.js"),
    import("sharp"),
  ]);
  const sharp = sharpModule.default;
  const worker = await createWorker("jpn", OEM.LSTM_ONLY);
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.SPARSE_TEXT,
    preserve_interword_spaces: "1",
  });

  try {
    for (const target of targets) {
      const date = datesByMonthDay.get(target.monthDay);
      if (!date) continue;
      const imageResponse = await fetch(target.url, { headers: { "user-agent": USER_AGENT }, cache: "no-store" });
      if (!imageResponse.ok) {
        warnings.push(`${date} ${ROOMS[target.prefix] || target.prefix}: 画像を取得できませんでした。`);
        continue;
      }
      const contentType = imageResponse.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) {
        warnings.push(`${date} ${ROOMS[target.prefix] || target.prefix}: 予定表画像が公開されていません。`);
        continue;
      }
      const bytes = new Uint8Array(await imageResponse.arrayBuffer());
      const sourceHash = sha256(bytes);
      const room = ROOMS[target.prefix] || `ファンスタジオ${target.prefix}`;
      documents.push({
        sourceId: "harmonyland-funstudio",
        sourceUrl: target.url,
        documentDate: date,
        contentType,
        sha256: sourceHash,
        bytes,
        metadata: { room, prefix: target.prefix },
      });
      onProgress?.(`${date} ${room}をOCR解析しています。`);
      const sourceImage = sharp(Buffer.from(bytes)).removeAlpha();
      const { data: rawPixels, info } = await sourceImage.raw().toBuffer({ resolveWithObject: true });
      const imageRows = detectImageRows(rawPixels, info.width, info.height, info.channels);
      const recognizedRows: Array<{
        startTime: string;
        endTime: string;
        rawName: string;
        hasIcon: boolean;
        confidence: number;
        timeOcr: string;
        nameOcr: string;
      }> = [];

      if (imageRows.length >= 3) {
        const divider = Math.round(info.width * 0.42);
        const leftMargin = Math.round(info.width * 0.03);
        const nameRight = Math.round(info.width * 0.8);
        const timeResults: Array<{ text: string; confidence: number }> = [];
        const nameResults: Array<{ text: string; confidence: number }> = [];

        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SINGLE_LINE,
          tessedit_char_whitelist: "0123456789:〜~- ",
          preserve_interword_spaces: "1",
        });
        onProgress?.(`${date} ${room}: 時刻欄を解析しています。`);
        for (let index = 0; index < imageRows.length; index += 1) {
          const row = imageRows[index];
          const cropTop = row.top + 6;
          const cropHeight = Math.max(20, row.bottom - row.top - 11);
          const timeImage = await sharp(Buffer.from(bytes))
            .extract({ left: leftMargin, top: cropTop, width: divider - leftMargin * 2, height: cropHeight })
            .resize({ height: Math.max(150, cropHeight * 3), withoutEnlargement: false })
            .grayscale()
            .normalize()
            .sharpen()
            .threshold(190)
            .extend({ top: 12, bottom: 12, left: 18, right: 18, background: "white" })
            .png()
            .toBuffer();
          const result = await worker.recognize(timeImage);
          timeResults.push({ text: normalizeSpace(result.data.text), confidence: result.data.confidence });
        }

        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SINGLE_LINE,
          tessedit_char_whitelist: "",
          preserve_interword_spaces: "1",
        });
        onProgress?.(`${date} ${room}: キャラクター名を解析しています。`);
        for (let index = 0; index < imageRows.length; index += 1) {
          const row = imageRows[index];
          const cropTop = row.top + 6;
          const cropHeight = Math.max(20, row.bottom - row.top - 11);
          const nameLeft = divider + 12;
          const nameImage = await sharp(Buffer.from(bytes))
            .extract({ left: nameLeft, top: cropTop, width: nameRight - nameLeft, height: cropHeight })
            .resize({ height: Math.max(170, cropHeight * 3), withoutEnlargement: false })
            .grayscale()
            .normalize()
            .sharpen()
            .threshold(190)
            .extend({ top: 12, bottom: 12, left: 18, right: 18, background: "white" })
            .png()
            .toBuffer();
          const result = await worker.recognize(nameImage);
          nameResults.push({ text: normalizeSpace(result.data.text), confidence: result.data.confidence });
        }

        const parsedTimes = fillMissingTimes(timeResults.map((result) => parseSingleTimeRange(result.text)));
        for (let index = 0; index < imageRows.length; index += 1) {
          const time = parsedTimes[index];
          const name = nameResults[index]?.text || "";
          if (!time || !name) {
            warnings.push(`${date} ${room} ${index + 1}行目: ${!time ? "時間" : "キャラクター名"}を認識できませんでした。`);
            continue;
          }
          recognizedRows.push({
            ...time,
            rawName: name,
            hasIcon: imageRows[index].hasIcon,
            confidence: (timeResults[index].confidence + nameResults[index].confidence) / 200,
            timeOcr: timeResults[index].text,
            nameOcr: name,
          });
        }
      } else {
        const metadata = await sharp(Buffer.from(bytes)).metadata();
        const processed = await sharp(Buffer.from(bytes))
          .resize({ width: Math.max(1200, (metadata.width || 600) * 2), withoutEnlargement: false })
          .grayscale()
          .normalize()
          .sharpen()
          .threshold(188)
          .png()
          .toBuffer();
        await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT, tessedit_char_whitelist: "", preserve_interword_spaces: "1" });
        const result = await worker.recognize(processed);
        for (const row of parseOcrRows(result.data.text)) {
          recognizedRows.push({ ...row, hasIcon: false, confidence: result.data.confidence / 100, timeOcr: result.data.text, nameOcr: row.rawName });
        }
      }

      if (recognizedRows.length === 0) {
        warnings.push(`${date} ${room}: OCRで予定行を認識できませんでした。原本画像を確認してください。`);
        continue;
      }
      if (imageRows.length > 0 && recognizedRows.length !== imageRows.length) {
        warnings.push(`${date} ${room}: 表は${imageRows.length}行ですが、読み取れた予定は${recognizedRows.length}件です。原本画像との差分確認が必要です。`);
      }
      for (const row of recognizedRows) {
        const character = canonicalCharacter(row.rawName);
        if (!character) {
          warnings.push(`${date} ${room} ${row.startTime}: キャラクター名を認識できませんでした。`);
          continue;
        }
        const appearance = row.hasIcon ? "（日焼け姿）" : "";
        schedules.push({
          externalKey: buildExternalKey([date, room, row.startTime, character.name]),
          sourceId: "harmonyland-funstudio",
          sourceReference: target.url,
          sourceHash,
          kind: "greeting",
          title: `${character.name}${appearance} ファンスタジオグリーティング`,
          date,
          startTime: row.startTime,
          endTime: row.endTime,
          scheduleType: "ファンスタジオグリーティング",
          location: room,
          description: row.hasIcon
            ? "予定表のアイコンから、日焼けをした姿で登場する案内を検出しました。OCRによる確認待ちデータのため、公式情報をご確認ください。"
            : "予定表画像をOCRで読み取った確認待ちデータです。登場内容は公式情報をご確認ください。",
          officialUrl: FUN_STUDIO_URL,
          characters: [character],
          verificationStatus: "needs-review",
          confidence: Math.max(0.35, Math.min(0.95, row.confidence)),
          rawPayload: { timeOcr: row.timeOcr, nameOcr: row.nameOcr, rawName: row.rawName, hasIcon: row.hasIcon, imageUrl: target.url },
        });
      }
    }
  } finally {
    await worker.terminate();
  }

  return { schedules, documents, warnings };
}
