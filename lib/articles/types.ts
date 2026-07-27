export type ArticleStatus = "draft" | "published";

export type ArticleTag = {
  id: string;
  name: string;
  slug: string;
  color: string;
  articleCount?: number;
};

export type ArticleSummary = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl: string;
  status: ArticleStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tags: ArticleTag[];
};

export type ArticleRecord = ArticleSummary & {
  contentJson: Record<string, unknown>;
  contentHtml: string;
};

export type ArticleInput = {
  title: string;
  slug: string;
  excerpt: string;
  contentJson: Record<string, unknown>;
  contentHtml: string;
  coverImageUrl: string;
  status: ArticleStatus;
  publishedAt: string | null;
  tagIds: string[];
};
