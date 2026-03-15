import { getImagesInPath } from "@/app/lib/firebase-admin";

const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://theplaceswewent.com").replace(/\/$/, "");
const RSS_MAX_ITEMS = 20;
const RSS_IMAGE_WIDTH = 1200;

function toResourceId(fullPath: string): string {
  const base64 = Buffer.from(unescape(encodeURIComponent(fullPath)), "binary").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  try {
    const images = await getImagesInPath("");
    const items = images.slice(0, RSS_MAX_ITEMS);
    const title = "The Places We Went — Photography by Darion";
    const description = "Recent photography. Landscapes, wildlife, architecture — the places we went, and what stuck.";

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${baseUrl}</link>
    <description>${escapeXml(description)}</description>
    <atom:link href="${baseUrl}/feed" rel="self" type="application/rss+xml"/>
    ${items
      .map(
        (img) => {
          const id = toResourceId(img.fullPath);
          const itemUrl = `${baseUrl}/?image=${encodeURIComponent(id)}`;
          const itemTitle = img.dimensions?.baseName ?? img.name;
          const contentType = img.contentType || "image/jpeg";
          const imageUrl = img.url
            ? `${baseUrl}/_next/image?url=${encodeURIComponent(img.url)}&w=${RSS_IMAGE_WIDTH}&q=75`
            : "";
          const enclosure = imageUrl
            ? `\n      <enclosure url="${escapeXml(imageUrl)}" length="${Math.round(img.size * 0.5)}" type="${escapeXml(contentType)}"/>`
            : "";
          return `    <item>
      <title>${escapeXml(itemTitle)}</title>
      <link>${itemUrl}</link>
      <guid isPermaLink="true">${itemUrl}</guid>${enclosure}
    </item>`;
        }
      )
      .join("\n")}
  </channel>
</rss>`;

    return new Response(rss, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch {
    return new Response("Feed unavailable", { status: 503 });
  }
}
