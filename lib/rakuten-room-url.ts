export function normalizeRakutenRoomUrl(value: unknown) {
  const input = typeof value === "string" ? value.trim() : "";
  if (!input) return "";

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("楽天ROOMのURLを正しく入力してください。");
  }

  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "room.rakuten.co.jp") {
    throw new Error("https://room.rakuten.co.jp/ から始まるURLを入力してください。");
  }

  url.hash = "";
  return url.toString();
}
