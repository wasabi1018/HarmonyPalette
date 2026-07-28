export type ArticleQualityTarget =
  | "title"
  | "slug"
  | "excerpt"
  | "seo-title"
  | "seo-description"
  | "cover"
  | "tags"
  | "content";

export type ArticleQualityStatus = "pass" | "warning" | "error";

export type ArticleLinkCheck = {
  url: string;
  status: "reachable" | "broken" | "unknown";
  httpStatus?: number;
};

export type ArticleQualityCheck = {
  id: string;
  label: string;
  message: string;
  status: ArticleQualityStatus;
  target: ArticleQualityTarget;
};

export type ArticleQualityReport = {
  score: number;
  errorCount: number;
  warningCount: number;
  passCount: number;
  checks: ArticleQualityCheck[];
  internalLinks: string[];
};

type ArticleQualityInput = {
  title: string;
  slug: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  coverImageUrl: string;
  tagCount: number;
  contentHtml: string;
  contentLength: number;
  linkChecks?: ArticleLinkCheck[];
};

function attributeValue(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  return match?.[2]?.trim() || "";
}

function stripTags(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:[a-z]+|#\d+|#x[\da-f]+);/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function articleLinks(contentHtml: string) {
  return Array.from(contentHtml.matchAll(/<a\b[^>]*>/gi))
    .map((match) => attributeValue(match[0], "href"));
}

function validLink(value: string) {
  if (!value) return false;
  if (value.startsWith("#")) return value.length > 1;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  if (value.startsWith("mailto:")) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.slice(7));
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function extractInternalArticleLinks(contentHtml: string) {
  return Array.from(new Set(
    articleLinks(contentHtml).filter((url) => (
      url.startsWith("/")
      && !url.startsWith("//")
      && !url.startsWith("/admin")
      && !url.startsWith("/api")
    )),
  )).slice(0, 20);
}

export function assessArticleQuality(input: ArticleQualityInput): ArticleQualityReport {
  const checks: ArticleQualityCheck[] = [];
  const add = (
    id: string,
    label: string,
    status: ArticleQualityStatus,
    message: string,
    target: ArticleQualityTarget,
  ) => checks.push({ id, label, status, message, target });

  const titleLength = input.title.trim().length;
  if (!titleLength) add("title", "記事タイトル", "error", "タイトルが未入力です。", "title");
  else if (titleLength < 15) add("title", "記事タイトル", "warning", "15文字以上にすると内容が伝わりやすくなります。", "title");
  else if (titleLength > 60) add("title", "記事タイトル", "warning", "60文字以内にすると検索結果で省略されにくくなります。", "title");
  else add("title", "記事タイトル", "pass", `${titleLength}文字で適切な長さです。`, "title");

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
    add("slug", "記事URL", "error", "半角英数字とハイフンでURLを設定してください。", "slug");
  } else {
    add("slug", "記事URL", "pass", "公開用URLの形式は正常です。", "slug");
  }

  const excerptLength = input.excerpt.trim().length;
  if (!excerptLength) add("excerpt", "記事の抜粋", "warning", "記事一覧用の紹介文を入力してください。", "excerpt");
  else if (excerptLength < 50) add("excerpt", "記事の抜粋", "warning", "50文字以上を目安に内容を補足してください。", "excerpt");
  else if (excerptLength > 160) add("excerpt", "記事の抜粋", "warning", "160文字以内にすると一覧で読みやすくなります。", "excerpt");
  else add("excerpt", "記事の抜粋", "pass", `${excerptLength}文字で適切な長さです。`, "excerpt");

  const searchTitleLength = (input.seoTitle.trim() || input.title.trim()).length;
  if (!searchTitleLength) add("seo-title", "検索タイトル", "error", "検索結果に使うタイトルがありません。", "seo-title");
  else if (searchTitleLength > 60) add("seo-title", "検索タイトル", "warning", "60文字以内に調整してください。", "seo-title");
  else add("seo-title", "検索タイトル", "pass", `${searchTitleLength}文字で検索表示に適しています。`, "seo-title");

  const searchDescriptionLength = (input.seoDescription.trim() || input.excerpt.trim()).length;
  if (!searchDescriptionLength) add("seo-description", "検索説明文", "warning", "検索結果に表示する説明文を入力してください。", "seo-description");
  else if (searchDescriptionLength < 70) add("seo-description", "検索説明文", "warning", "70文字以上を目安に記事の内容を説明してください。", "seo-description");
  else if (searchDescriptionLength > 160) add("seo-description", "検索説明文", "warning", "160文字以内に調整してください。", "seo-description");
  else add("seo-description", "検索説明文", "pass", `${searchDescriptionLength}文字で検索表示に適しています。`, "seo-description");

  if (input.contentLength < 100) add("content-length", "本文のボリューム", "error", "本文を100文字以上入力してください。", "content");
  else if (input.contentLength < 500) add("content-length", "本文のボリューム", "warning", "500文字以上あると読者へ詳しく伝えられます。", "content");
  else add("content-length", "本文のボリューム", "pass", `${input.contentLength.toLocaleString("ja-JP")}文字あります。`, "content");

  const headings = Array.from(input.contentHtml.matchAll(/<h([2-4])(?:\s[^>]*)?>([\s\S]*?)<\/h\1>/gi))
    .map((match) => ({ level: Number(match[1]), text: stripTags(match[2]) }));
  const headingJump = headings.some((heading, index) => (
    (index === 0 && heading.level !== 2)
    || (index > 0 && heading.level > headings[index - 1].level + 1)
  ));
  const duplicateHeading = headings.some((heading, index) => (
    Boolean(heading.text)
    && headings.findIndex((item) => item.text === heading.text) !== index
  ));
  if (!headings.length) add("headings", "見出し構造", "warning", "見出し2を使って本文を読みやすく区切ってください。", "content");
  else if (headingJump) add("headings", "見出し構造", "error", "見出しは「見出し2」から順番に使用してください。", "content");
  else if (duplicateHeading) add("headings", "見出し構造", "warning", "同じ見出し文が複数あります。", "content");
  else add("headings", "見出し構造", "pass", `${headings.length}個の見出しが正しい順序です。`, "content");

  const images = Array.from(input.contentHtml.matchAll(/<img\b[^>]*>/gi));
  const missingAltCount = images.filter((match) => !attributeValue(match[0], "alt")).length;
  if (missingAltCount) add("image-alt", "画像の代替テキスト", "error", `${missingAltCount}枚の画像に説明がありません。`, "content");
  else if (images.length) add("image-alt", "画像の代替テキスト", "pass", `${images.length}枚すべてに説明があります。`, "content");
  else add("image-alt", "画像の代替テキスト", "pass", "本文画像はありません。", "content");

  const links = articleLinks(input.contentHtml);
  const invalidLinkCount = links.filter((url) => !validLink(url)).length;
  if (invalidLinkCount) add("link-format", "リンクURL", "error", `${invalidLinkCount}件のリンクURLを修正してください。`, "content");
  else if (links.length) add("link-format", "リンクURL", "pass", `${links.length}件のURL形式は正常です。`, "content");
  else add("link-format", "リンクURL", "pass", "本文リンクはありません。", "content");

  const internalLinks = extractInternalArticleLinks(input.contentHtml);
  if (!internalLinks.length) {
    add("link-reachability", "リンク先の確認", "pass", "確認対象の内部リンクはありません。", "content");
  } else if (!input.linkChecks?.length) {
    add("link-reachability", "リンク先の確認", "warning", `${internalLinks.length}件の内部リンクが未確認です。`, "content");
  } else {
    const broken = input.linkChecks.filter((item) => item.status === "broken");
    const unknown = input.linkChecks.filter((item) => item.status === "unknown");
    if (broken.length) add("link-reachability", "リンク先の確認", "error", `${broken.length}件のリンク先が見つかりません。`, "content");
    else if (unknown.length) add("link-reachability", "リンク先の確認", "warning", `${unknown.length}件のリンク先を確認できませんでした。`, "content");
    else add("link-reachability", "リンク先の確認", "pass", `${internalLinks.length}件の内部リンクに到達できます。`, "content");
  }

  if (!input.coverImageUrl) add("cover", "アイキャッチ画像", "warning", "一覧やSNS共有用の画像を設定してください。", "cover");
  else add("cover", "アイキャッチ画像", "pass", "アイキャッチ画像が設定されています。", "cover");

  if (!input.tagCount) add("tags", "記事タグ", "warning", "分類用のタグを1つ以上設定してください。", "tags");
  else add("tags", "記事タグ", "pass", `${input.tagCount}個のタグが設定されています。`, "tags");

  const errorCount = checks.filter((check) => check.status === "error").length;
  const warningCount = checks.filter((check) => check.status === "warning").length;
  const passCount = checks.filter((check) => check.status === "pass").length;
  return {
    score: Math.max(0, 100 - errorCount * 15 - warningCount * 7),
    errorCount,
    warningCount,
    passCount,
    checks,
    internalLinks,
  };
}
