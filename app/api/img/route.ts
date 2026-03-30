import sharp from "sharp";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTNAMES = new Set([
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
  "photogallery-62b63.firebasestorage.app",
]);

const MAX_WIDTH = 3840;
const DEFAULT_QUALITY = 75;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const url = searchParams.get("url");
  const w = parseInt(searchParams.get("w") ?? "", 10);
  const q = Math.min(100, Math.max(1, parseInt(searchParams.get("q") ?? String(DEFAULT_QUALITY), 10)));

  if (!url) {
    return new NextResponse("Missing url", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  if (!ALLOWED_HOSTNAMES.has(parsed.hostname)) {
    return new NextResponse("Disallowed hostname", { status: 403 });
  }

  const width = Number.isFinite(w) && w > 0 ? Math.min(w, MAX_WIDTH) : undefined;

  const upstream = await fetch(url);
  if (!upstream.ok) {
    return new NextResponse("Failed to fetch image", { status: 502 });
  }

  const buffer = Buffer.from(await upstream.arrayBuffer());

  const output = await sharp(buffer)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: q })
    .toBuffer();

  return new NextResponse(output, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
