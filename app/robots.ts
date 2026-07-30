import type { MetadataRoute } from "next";
import { SITE_URL, siteUrl } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/"],
    }],
    sitemap: siteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
