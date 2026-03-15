import type { Metadata } from "next";
import Home from "../home/Home";
import { formatGalleryName } from "../lib/galleries";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://theplaceswewent.com";
const defaultTitle = "The Places We Went | Photography by Darion";
const defaultDescription =
  "Photography by Darion. Landscapes, wildlife, architecture — the places we went, and what stuck.";

type PageProps = { params: Promise<{ gallery?: string[] }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { gallery } = await params;
  const slug = gallery?.[0];
  const isHome = !slug;

  if (isHome) {
    return {
      title: defaultTitle,
      description: defaultDescription,
      openGraph: {
        title: defaultTitle,
        description: defaultDescription,
        url: siteUrl,
      },
      alternates: { canonical: siteUrl },
    };
  }

  const galleryName = formatGalleryName(slug);
  const description = `${galleryName} — photography by Darion. Part of the places we went.`;
  const url = `${siteUrl.replace(/\/$/, "")}/${slug}`;

  return {
    title: galleryName,
    description,
    openGraph: {
      title: galleryName,
      description,
      url,
    },
    alternates: { canonical: url },
  };
}

export default function GalleryPage() {
  return <Home />;
}
