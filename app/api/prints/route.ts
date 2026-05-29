import { NextResponse } from "next/server";
import { getFirestore, getBucket, IMAGE_STATS_COLLECTION } from "@/app/lib/firebase-admin";
import { fromResourceId } from "@/app/lib/resource-id-server";

const DIMENSIONS_REGEX = /^(.+)\.(\d+)x(\d+)\.([a-zA-Z]+)$/;

function parseDimensions(name: string) {
  const match = name.match(DIMENSIONS_REGEX);
  if (!match) return null;
  const [, , w, h] = match;
  const width = parseInt(w, 10);
  const height = parseInt(h, 10);
  if (Number.isNaN(width) || Number.isNaN(height) || height === 0) return null;
  return { width, height };
}

export interface PrintableImage {
  resourceId: string;
  fullPath: string;
  url: string;
  name: string;
  printfulProductId: string;
  dimensions: { width: number; height: number } | null;
  title?: string;
  caption?: string;
}

export async function GET() {
  try {
    const db = getFirestore();
    const snap = await db
      .collection(IMAGE_STATS_COLLECTION)
      .where("metadata.printfulProductId", ">=", "")
      .get();

    if (snap.empty) {
      return NextResponse.json({ prints: [] });
    }

    const bucket = getBucket();
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    const prints = await Promise.all(
      snap.docs.map(async (doc) => {
        const resourceId = doc.id;
        const fullPath = fromResourceId(resourceId);
        if (!fullPath) return null;

        const meta: Record<string, string> = doc.data()?.metadata ?? {};
        const printfulProductId = meta.printfulProductId;
        if (!printfulProductId) return null;

        const name = fullPath.split("/").pop() ?? fullPath;
        const dimensions = parseDimensions(name);

        try {
          const [signedUrl] = await bucket
            .file(fullPath)
            .getSignedUrl({ action: "read", expires });

          const item: PrintableImage = {
            resourceId,
            fullPath,
            url: signedUrl,
            name,
            printfulProductId,
            dimensions,
            ...(meta.title && { title: meta.title }),
            ...(meta.caption && { caption: meta.caption }),
          };
          return item;
        } catch {
          return null;
        }
      })
    );

    return NextResponse.json({
      prints: prints.filter((p): p is PrintableImage => p !== null),
    });
  } catch (err) {
    console.error("GET /api/prints:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
