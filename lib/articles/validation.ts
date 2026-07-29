import "server-only";

import sanitizeHtml from "sanitize-html";
import type {
  ArticleDestination,
  ArticleInput,
  ArticleStatus,
} from "@/lib/articles/types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredText(value: unknown, label: string, maxLength: number) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label}を入力してください。`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new Error(`${label}は${maxLength}文字以内で入力してください。`);
  }
  return normalized;
}

function optionalText(value: unknown, label: string, maxLength: number) {
  if (value == null || value === "") return "";
  if (typeof value !== "string") throw new Error(`${label}の形式が正しくありません。`);
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new Error(`${label}は${maxLength}文字以内で入力してください。`);
  }
  return normalized;
}

export function normalizeArticleSlug(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function sanitizeArticleHtml(value: string) {
  return sanitizeHtml(value, {
    allowedTags: [
      "p",
      "br",
      "h2",
      "h3",
      "h4",
      "strong",
      "em",
      "u",
      "s",
      "span",
      "a",
      "ul",
      "ol",
      "li",
      "blockquote",
      "hr",
      "img",
      "code",
      "pre",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title"],
      span: ["style"],
    },
    allowedStyles: {
      span: {
        color: [
          /^#[0-9a-f]{3,8}$/i,
          /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i,
        ],
      },
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https"],
    },
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer",
      }),
    },
  });
}

export function parseArticleInput(value: unknown): ArticleInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("記事データの形式が正しくありません。");
  }
  const input = value as Record<string, unknown>;
  const title = requiredText(input.title, "タイトル", 160);
  const slug = normalizeArticleSlug(requiredText(input.slug, "スラッグ", 120));
  if (!slug) throw new Error("スラッグは半角英数字を含めて入力してください。");

  const excerpt = optionalText(input.excerpt, "抜粋", 240);
  const seoTitle = optionalText(input.seoTitle, "SEOタイトル", 60);
  const seoDescription = optionalText(input.seoDescription, "SEO説明文", 160);
  const coverImageUrl = optionalText(input.coverImageUrl, "アイキャッチ画像URL", 2000);
  if (
    coverImageUrl
    && !coverImageUrl.startsWith("/")
    && !/^https:\/\//i.test(coverImageUrl)
  ) {
    throw new Error("アイキャッチ画像URLはhttps://または/から始まるパスで入力してください。");
  }

  let status: ArticleStatus = input.status === "published"
    ? "published"
    : input.status === "scheduled"
      ? "scheduled"
      : "draft";
  const destination: ArticleDestination = input.destination === "guide"
    ? "guide"
    : "articles";
  const rawContentJson = input.contentJson;
  if (!rawContentJson || typeof rawContentJson !== "object" || Array.isArray(rawContentJson)) {
    throw new Error("本文データの形式が正しくありません。");
  }
  const contentSize = JSON.stringify(rawContentJson).length;
  if (contentSize > 1_000_000) throw new Error("本文データが大きすぎます。");

  const rawContentHtml = typeof input.contentHtml === "string" ? input.contentHtml : "";
  const contentHtml = sanitizeArticleHtml(rawContentHtml);
  if (contentHtml.length > 2_000_000) throw new Error("本文が長すぎます。");

  const tagIds = Array.isArray(input.tagIds)
    ? Array.from(new Set(input.tagIds.filter((id): id is string => (
      typeof id === "string" && UUID_PATTERN.test(id)
    )))).slice(0, 20)
    : [];
  const seriesId = typeof input.seriesId === "string" && UUID_PATTERN.test(input.seriesId)
    ? input.seriesId
    : null;
  const rawSeriesOrder = Number(input.seriesOrder);
  const seriesOrder = seriesId && Number.isInteger(rawSeriesOrder)
    ? Math.min(9999, Math.max(1, rawSeriesOrder))
    : seriesId
      ? 1
      : null;

  let publishedAt: string | null = null;
  if (status === "published" || status === "scheduled") {
    if (typeof input.publishedAt === "string" && input.publishedAt.trim()) {
      const timestamp = Date.parse(input.publishedAt);
      if (!Number.isFinite(timestamp)) throw new Error("公開日時の形式が正しくありません。");
      publishedAt = new Date(timestamp).toISOString();
      if (status === "scheduled" && timestamp <= Date.now()) {
        throw new Error("予約公開日時は現在より後の日時を指定してください。");
      }
      if (status === "published" && timestamp > Date.now()) status = "scheduled";
    } else {
      if (status === "scheduled") throw new Error("予約公開日時を入力してください。");
      publishedAt = new Date().toISOString();
    }
  }

  return {
    title,
    slug,
    excerpt,
    seoTitle,
    seoDescription,
    contentJson: rawContentJson as Record<string, unknown>,
    contentHtml,
    coverImageUrl,
    status: status as ArticleStatus,
    destination,
    publishedAt,
    tagIds,
    seriesId,
    seriesOrder,
  };
}

export function parseTagInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("タグデータの形式が正しくありません。");
  }
  const input = value as Record<string, unknown>;
  const name = requiredText(input.name, "タグ名", 40);
  const slug = normalizeArticleSlug(requiredText(input.slug, "スラッグ", 80)).slice(0, 80);
  if (!slug) throw new Error("スラッグは半角英数字を含めて入力してください。");
  const color = optionalText(input.color, "カラー", 7) || "#eb6e98";
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    throw new Error("カラーは#から始まる6桁のカラーコードで入力してください。");
  }
  return { name, slug, color };
}

export function parseSeriesInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("シリーズデータの形式が正しくありません。");
  }
  const input = value as Record<string, unknown>;
  const title = requiredText(input.title, "シリーズ名", 100);
  const slug = normalizeArticleSlug(requiredText(input.slug, "スラッグ", 80)).slice(0, 80);
  if (!slug) throw new Error("スラッグは半角英数字を含めて入力してください。");
  const description = optionalText(input.description, "説明", 300);
  return { title, slug, description };
}

export function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}
