export type ArticleStatus = "draft" | "scheduled" | "published";

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
  seoTitle: string;
  seoDescription: string;
  coverImageUrl: string;
  status: ArticleStatus;
  publishedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tags: ArticleTag[];
};

export type ArticleRecord = ArticleSummary & {
  contentJson: Record<string, unknown>;
  contentHtml: string;
};

export type ArticleRevision = {
  id: string;
  articleId: string;
  revisionNumber: number;
  title: string;
  status: ArticleStatus;
  createdAt: string;
};

export type ArticleInput = {
  title: string;
  slug: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  contentJson: Record<string, unknown>;
  contentHtml: string;
  coverImageUrl: string;
  status: ArticleStatus;
  publishedAt: string | null;
  tagIds: string[];
};
