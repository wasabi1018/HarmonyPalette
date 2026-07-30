const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

export const SITE_NAME = "Harmony Palette";
export const SITE_URL = (configuredSiteUrl || "https://harmonypalette.jp").replace(/\/+$/, "");
export const INSTAGRAM_URL = "https://www.instagram.com/harmony__palette/";
export const HARMONYLAND_OFFICIAL_URL = "https://www.harmonyland.jp/";

export function siteUrl(path = "/") {
  return new URL(path, `${SITE_URL}/`).toString();
}
