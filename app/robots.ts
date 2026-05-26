import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/lookup?", "/waitlist?"],
    },
    sitemap: "https://korlo.com.au/sitemap.xml",
  };
}
