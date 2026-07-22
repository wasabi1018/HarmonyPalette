import { normalizeSpace } from "@/lib/official-import/utils";

export type PdfTextItem = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
};

export type PdfTextLine = {
  text: string;
  x: number;
  y: number;
  page: number;
  items: PdfTextItem[];
};

export async function extractPdfTextItems(bytes: Uint8Array) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // PDF.js may transfer and detach the supplied ArrayBuffer. Parse a copy so
  // the original bytes remain available for source archiving in Supabase.
  const parseBytes = Uint8Array.from(bytes);
  const document = await pdfjs.getDocument({
    data: parseBytes,
    useSystemFonts: true,
    isEvalSupported: false,
  }).promise;
  const items: PdfTextItem[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      for (const value of content.items) {
        if (!("str" in value) || !value.str.trim()) continue;
        items.push({
          text: normalizeSpace(value.str),
          x: value.transform[4],
          y: value.transform[5],
          width: value.width,
          height: value.height,
          page: pageNumber,
        });
      }
      page.cleanup();
    }
  } finally {
    await document.destroy();
  }

  return items;
}

export function groupPdfTextLines(items: PdfTextItem[], tolerance = 2.2) {
  const lines: PdfTextLine[] = [];
  const sorted = [...items].sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);

  for (const item of sorted) {
    const line = lines.find((candidate) => candidate.page === item.page && Math.abs(candidate.y - item.y) <= tolerance);
    if (line) {
      line.items.push(item);
      line.x = Math.min(line.x, item.x);
      continue;
    }
    lines.push({ text: "", x: item.x, y: item.y, page: item.page, items: [item] });
  }

  return lines
    .map((line) => {
      const ordered = line.items.sort((a, b) => a.x - b.x);
      return {
        ...line,
        text: normalizeSpace(ordered.map((item) => item.text).join(" ")),
      };
    })
    .filter((line) => line.text)
    .sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
}
