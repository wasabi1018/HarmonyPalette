function stripTags(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:[a-z]+|#\d+|#x[\da-f]+);/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const articlePublishedDateFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function formatArticlePublishedDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return articlePublishedDateFormatter.format(date);
}

function attributeValue(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  return match?.[2]?.trim() || "";
}

function escapeAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function isUnhelpfulArticleImageAlt(value: string) {
  const normalized = value.normalize("NFKC").trim();
  if (!normalized) return true;
  if (/^\d+$/.test(normalized)) return true;
  if (/^(?:image|img|photo|pic|dsc)[-_ ]?\d*$/i.test(normalized)) return true;
  if (/^(?:画像|写真|掲載画像|記事画像)$/.test(normalized)) return true;
  if (/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(normalized)) return true;
  if (/\.(?:avif|gif|jpe?g|png|webp)$/i.test(normalized)) return true;
  return false;
}

export function applyContextualArticleImageAlt(
  contentHtml: string,
  articleTitle: string,
) {
  let currentHeading = "";
  return contentHtml.replace(
    /<h([2-4])\b[^>]*>([\s\S]*?)<\/h\1>|<img\b[^>]*>/gi,
    (match, _rawLevel: string | undefined, headingHtml: string | undefined) => {
      if (typeof headingHtml === "string") {
        currentHeading = stripTags(headingHtml);
        return match;
      }

      const currentAlt = attributeValue(match, "alt");
      if (!isUnhelpfulArticleImageAlt(currentAlt)) return match;

      const context = currentHeading || articleTitle.trim() || "記事の内容";
      const alt = escapeAttribute(`${context}を紹介する画像`);
      if (/\balt\s*=\s*(["']).*?\1/i.test(match)) {
        return match.replace(/\balt\s*=\s*(["']).*?\1/i, `alt="${alt}"`);
      }
      return match.replace(/\s*\/?\s*>$/, (ending: string) => (
        ending.includes("/") ? ` alt="${alt}" />` : ` alt="${alt}">`
      ));
    },
  );
}
