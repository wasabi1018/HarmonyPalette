const publicArticleImagePrefix = "/storage/v1/object/public/article-images/";
const proxyArticleImagePrefix = "/api/article-images/";

function configuredSupabaseOrigin() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function publicArticleImageUrl(value: string) {
  if (!value || value.startsWith(proxyArticleImagePrefix)) return value;
  const supabaseOrigin = configuredSupabaseOrigin();
  if (!supabaseOrigin) return value;

  try {
    const url = new URL(value);
    if (url.origin !== supabaseOrigin || !url.pathname.startsWith(publicArticleImagePrefix)) {
      return value;
    }
    const rawPath = url.pathname.slice(publicArticleImagePrefix.length);
    const safePath = rawPath
      .split("/")
      .filter(Boolean)
      .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
      .join("/");
    return safePath ? `${proxyArticleImagePrefix}${safePath}` : value;
  } catch {
    return value;
  }
}

export function proxyArticleImageSources(html: string) {
  return html.replace(
    /(<img\b[^>]*\bsrc=["'])([^"']+)(["'])/gi,
    (match, prefix: string, source: string, suffix: string) => {
      const proxied = publicArticleImageUrl(source);
      return proxied === source ? match : `${prefix}${proxied}${suffix}`;
    },
  );
}
