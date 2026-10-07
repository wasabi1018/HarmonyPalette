import { RakutenPrSection } from "@/components/rakuten-pr-section";
import { splitArticleHtmlBeforeHeading } from "@/lib/articles/rakuten-content";
import type { RakutenPrDisplay } from "@/lib/rakuten-pr";

export function ArticleRakutenBody({ html, promotion }: {
  html: string;
  promotion: { display: RakutenPrDisplay; beforeHeadingId?: string } | null;
}) {
  const split = promotion ? splitArticleHtmlBeforeHeading(html, promotion.beforeHeadingId) : null;
  if (!split) return <div className="article-prose" dangerouslySetInnerHTML={{ __html: html }} />;
  return <>
    <div className="article-prose" dangerouslySetInnerHTML={{ __html: split.before }} />
    <RakutenPrSection placement={promotion!.display} twoColumns className="article-print-hidden my-9" />
    <div className="article-prose" dangerouslySetInnerHTML={{ __html: split.after }} />
  </>;
}
