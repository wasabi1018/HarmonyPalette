import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const cacheControl = "public, max-age=31536000, s-maxage=31536000, immutable";

function upstreamUrl(path: string[]) {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!baseUrl || path.length === 0) return null;
  if (path.some((segment) => !segment || segment === "." || segment === "..")) return null;
  try {
    const base = new URL(baseUrl);
    const encodedPath = path.map((segment) => encodeURIComponent(segment)).join("/");
    return new URL(`/storage/v1/object/public/article-images/${encodedPath}`, base).toString();
  } catch {
    return null;
  }
}

async function serve(path: string[], head = false) {
  const url = upstreamUrl(path);
  if (!url) return NextResponse.json({ error: "Invalid image path." }, { status: 400 });
  const upstream = await fetch(url, {
    method: head ? "HEAD" : "GET",
    cache: "force-cache",
    next: { revalidate: 31_536_000 },
  });
  if (!upstream.ok) return new NextResponse(null, { status: upstream.status === 404 ? 404 : 502 });

  const headers = new Headers({
    "Cache-Control": cacheControl,
    "Content-Type": upstream.headers.get("content-type") || "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
  });
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);
  return new NextResponse(head ? null : upstream.body, { status: 200, headers });
}

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return serve(path);
}

export async function HEAD(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return serve(path, true);
}
