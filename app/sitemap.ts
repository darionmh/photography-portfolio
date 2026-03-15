import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://theplaceswewent.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: baseUrl.replace(/\/$/, ""),
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 1,
    },
  ];
}
