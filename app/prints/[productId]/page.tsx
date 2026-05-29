import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getFirestore,
  getBucket,
  IMAGE_STATS_COLLECTION,
} from "@/app/lib/firebase-admin";
import { fromResourceId } from "@/app/lib/resource-id-server";
import PrintDetailClient, { type PrintfulVariant } from "./PrintDetailClient";

const DIMENSIONS_REGEX = /^(.+)\.(\d+)x(\d+)\.([a-zA-Z]+)$/;

function parseName(name: string) {
  const match = name.match(DIMENSIONS_REGEX);
  if (!match)
    return { baseName: name.replace(/\.[^.]+$/, ""), width: 1200, height: 900 };
  return {
    baseName: match[1],
    width: parseInt(match[2], 10),
    height: parseInt(match[3], 10),
  };
}

async function fetchPrintfulProduct(productId: string): Promise<{
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  variants: PrintfulVariant[];
} | null> {
  const apiKey = process.env.PRINTFUL_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.printful.com/store/products/${productId}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        next: { revalidate: 300 },
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.result;
    if (!result) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const variants: PrintfulVariant[] = (result.sync_variants ?? []).map((v: any) => {
      const previewFile =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (v.files ?? []).find((f: any) => f.type === "preview" && f.preview_url) ??
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (v.files ?? []).find((f: any) => f.preview_url);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const thumbFile = (v.files ?? []).find((f: any) => f.thumbnail_url);
      const size: string =
        v.product?.size ||
        (typeof v.name === "string" ? v.name.split("/").pop()?.trim() ?? v.name : v.name);
      return {
        id: v.id,
        size,
        retailPrice: v.retail_price ?? "0",
        currency: v.currency ?? "USD",
        previewUrl: previewFile?.preview_url ?? null,
        thumbnailUrl: thumbFile?.thumbnail_url ?? null,
      };
    });

    const storeDescription: string | null = result.sync_product?.description ?? null;

    let catalogDescription: string | null = null;
    if (!storeDescription) {
      const catalogProductId = result.sync_variants?.[0]?.product?.product_id;
      if (catalogProductId) {
        try {
          const catalogRes = await fetch(
            `https://api.printful.com/products/${catalogProductId}`,
            {
              headers: { Authorization: `Bearer ${apiKey}` },
              next: { revalidate: 86400 },
            },
          );
          if (catalogRes.ok) {
            const catalogData = await catalogRes.json();
            catalogDescription = catalogData?.result?.product?.description ?? null;
          }
        } catch {
          // ignore, description is optional
        }
      }
    }

    return {
      name: result.sync_product?.name ?? "",
      description: storeDescription ?? catalogDescription,
      thumbnailUrl: result.sync_product?.thumbnail_url ?? null,
      variants,
    };
  } catch {
    return null;
  }
}

async function getProductData(productId: string) {
  const db = getFirestore();
  const snap = await db
    .collection(IMAGE_STATS_COLLECTION)
    .where("metadata.printfulProductId", "==", productId)
    .limit(1)
    .get();

  if (snap.empty) return null;

  const doc = snap.docs[0];
  const resourceId = doc.id;
  const meta: Record<string, string> = doc.data()?.metadata ?? {};

  const fullPath = fromResourceId(resourceId);
  if (!fullPath) return null;

  const bucket = getBucket();
  const file = bucket.file(fullPath);
  const [exists] = await file.exists();
  if (!exists) return null;

  const expires = new Date(Date.now() + 60 * 60 * 1000);
  const [signedUrl] = await file.getSignedUrl({ action: "read", expires });

  const name = fullPath.split("/").pop() ?? fullPath;
  const { baseName, width, height } = parseName(name);

  const [printful] = await Promise.all([fetchPrintfulProduct(productId)]);

  return {
    meta,
    signedUrl,
    baseName,
    width,
    height,
    resourceId,
    printful,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ productId: string }>;
}): Promise<Metadata> {
  const { productId } = await params;
  const data = await getProductData(productId);
  if (!data) return {};

  const title =
    data.meta.title?.trim() ||
    data.printful?.name ||
    data.baseName;
  const description =
    data.meta.caption?.trim() || `Buy a fine art print of "${title}".`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: data.signedUrl }],
    },
  };
}

export default async function PrintDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const data = await getProductData(productId);
  if (!data) notFound();

  const { meta, signedUrl, baseName, width, height, resourceId, printful } =
    data;

  const title =
    meta.title?.trim() || printful?.name || baseName;
  const caption = meta.caption?.trim() ?? null;
  const alt = meta.alt?.trim() || title;

  return (
    <div className="max-w-5xl">
      <Link
        href="/"
        className="text-sm text-muted hover:text-foreground lowercase mb-8 inline-block"
      >
        ← back to gallery
      </Link>

      <PrintDetailClient
        title={title}
        caption={caption}
        alt={alt}
        originalPhotoUrl={signedUrl}
        originalWidth={width}
        originalHeight={height}
        productThumbnailUrl={printful?.thumbnailUrl ?? null}
        productDescription={printful?.description ?? null}
        variants={printful?.variants ?? []}
        resourceId={resourceId}
      />
    </div>
  );
}
