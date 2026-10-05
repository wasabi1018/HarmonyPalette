export function isAdSenseEligiblePage(pathname: string) {
  if (pathname === "/") return true;

  // 一覧・検索・シリーズページを除き、記事詳細だけを広告対象にする。
  const article = pathname.match(/^\/articles\/([^/]+)$/);
  if (!article) return false;

  return !["series", "feed.xml", "feed.json"].includes(article[1]);
}
