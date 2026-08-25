type SearchParamsLike = Pick<URLSearchParams, "toString">;

export function isAdSenseEligiblePage(
  pathname: string,
  searchParams: SearchParamsLike,
) {
  if (pathname === "/schedule") return searchParams.toString() === "";
  if (pathname === "/") return true;
  if (pathname === "/articles" || pathname.startsWith("/articles/")) return true;
  if (pathname === "/guide" || pathname === "/characters") return true;

  return false;
}
