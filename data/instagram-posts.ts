export const instagramAccountUrl = "https://www.instagram.com/harmony__palette/";

export const defaultInstagramPostUrls = [
  "https://www.instagram.com/p/DbTNrIvkqak/",
  "https://www.instagram.com/p/DbUUtP1khiS/",
] as const;

export type InstagramPostUrls = [string, string];

export function normalizeInstagramPostUrl(value: string) {
  const input = value.trim();
  if (!input) throw new Error("Instagram投稿URLを入力してください。");

  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error("正しいInstagram投稿URLを入力してください。");
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (!["instagram.com", "instagr.am"].includes(hostname)) {
    throw new Error("instagram.comの投稿URLを入力してください。");
  }

  const match = parsed.pathname.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]+)\/?$/);
  if (!match) {
    throw new Error("Instagramの投稿・リールの共有URLを入力してください。");
  }

  return `https://www.instagram.com/${match[1]}/${match[2]}/`;
}

export function normalizeInstagramPostUrls(values: unknown): InstagramPostUrls {
  if (!Array.isArray(values) || values.length !== 2) {
    throw new Error("Instagram投稿URLを2件入力してください。");
  }
  const postUrls = values.map((value) => normalizeInstagramPostUrl(
    typeof value === "string" ? value : "",
  )) as InstagramPostUrls;
  if (postUrls[0] === postUrls[1]) {
    throw new Error("異なるInstagram投稿URLを2件入力してください。");
  }
  return postUrls;
}
