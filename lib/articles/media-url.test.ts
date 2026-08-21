import assert from "node:assert/strict";
import test from "node:test";
import {
  proxyArticleImageSources,
  publicArticleImageUrl,
} from "@/lib/articles/media-url";

test("Supabase article images are routed through the application cache", () => {
  const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  try {
    assert.equal(
      publicArticleImageUrl("https://example.supabase.co/storage/v1/object/public/article-images/guide/cover image.png"),
      "/api/article-images/guide/cover%20image.png",
    );
    assert.equal(
      publicArticleImageUrl("https://images.example.com/cover.png"),
      "https://images.example.com/cover.png",
    );
  } finally {
    process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
  }
});

test("article body image sources are proxied without changing external images", () => {
  const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  try {
    const html = '<p><img src="https://example.supabase.co/storage/v1/object/public/article-images/body/a.jpg"><img src="https://images.example.com/b.jpg"></p>';
    assert.equal(
      proxyArticleImageSources(html),
      '<p><img src="/api/article-images/body/a.jpg"><img src="https://images.example.com/b.jpg"></p>',
    );
  } finally {
    process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
  }
});
