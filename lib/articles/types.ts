export type ArticleStatus = "draft" | "scheduled" | "published";
export type ArticleDestination = "articles" | "guide";

export type ArticleTag = {
  id: string;
  name: string;
  slug: string;
  color: string;
  articleCount?: number;
};

export type ArticleSeries = {
  id: string;
  title: string;
  slug: string;
  description: string;
  articleCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type ArticleSeriesAssignment = {
  seriesId: string | null;
  seriesOrder: number | null;
};

export type ArticleMedia = {
  id: string;
  storagePath: string;
  publicUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  altText: string;
  createdAt: string;
  updatedAt: string;
};

export type ArticleAnalyticsPoint = {
  date: string;
  views: number;
};

export type ArticleAnalyticsItem = {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string;
  views: number;
};

export type ArticleAnalyticsData = {
  rangeDays: number;
  totalViews: number;
  todayViews: number;
  averageViews: number;
  daily: ArticleAnalyticsPoint[];
  topArticles: ArticleAnalyticsItem[];
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
  destination: ArticleDestination;
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
  destination: ArticleDestination;
  publishedAt: string | null;
  tagIds: string[];
  seriesId: string | null;
  seriesOrder: number | null;
};
