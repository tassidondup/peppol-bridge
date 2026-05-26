import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://korlo.com.au";
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/lookup`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/bulk`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ];
}
