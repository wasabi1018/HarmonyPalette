const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

export const SITE_NAME = "Harmony Palette";
export const SITE_URL = (configuredSiteUrl || "https://harmonypalette.jp").replace(/\/+$/, "");
export const SITE_ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const SITE_WEBSITE_ID = `${SITE_URL}/#website`;
export const GOOGLE_ADSENSE_ACCOUNT = "ca-pub-6946374838129766";
export const SITE_AUTHOR_NAME = "Harmony Palette 運営";
export const SITE_AUTHOR_DESCRIPTION = "月に複数回ハーモニーランドを訪れる家族が、現地体験と公式情報の確認をもとに執筆しています。";
export const INSTAGRAM_URL = "https://www.instagram.com/harmony__palette/";
export const HARMONYLAND_OFFICIAL_URL = "https://www.harmonyland.jp/";

export function siteUrl(path = "/") {
  return new URL(path, `${SITE_URL}/`).toString();
}
