import { extractPdfTextItems, groupPdfTextLines } from "@/lib/official-import/pdf";

async function main() {
  const url = process.argv[2];
  if (!url) throw new Error("PDF URLを指定してください。");

  const response = await fetch(url, { headers: { "user-agent": "HarmonyPaletteImporter/0.1 (+https://harmony-palette.example)" } });
  if (!response.ok) throw new Error(`PDFの取得に失敗しました: ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const items = await extractPdfTextItems(bytes);

  console.log(JSON.stringify({
    itemCount: items.length,
    lines: groupPdfTextLines(items).map((line) => ({
      page: line.page,
      x: Math.round(line.x * 10) / 10,
      y: Math.round(line.y * 10) / 10,
      text: line.text,
    })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
