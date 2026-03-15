import { NextResponse } from "next/server";
import exifr from "exifr";
import sharp from "sharp";
import { verifyAdminToken } from "@/app/lib/admin-auth";
import { getBucket, getFirestore, IMAGE_STATS_COLLECTION } from "@/app/lib/firebase-admin";
import { toResourceId } from "@/app/lib/resource-id-server";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"];
const FOLDER_REGEX = /^[a-zA-Z0-9_.-]*$/;

/** Sanitize folder path: only allow safe folder names (no path traversal). */
function sanitizeFolder(raw: string): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "";
  const safe = trimmed.replace(/\/+/g, "").split("/").filter(Boolean).join("/");
  return safe.split("/").every((s) => FOLDER_REGEX.test(s)) ? safe : "";
}

/** Firestore-friendly key: alphanumeric, underscore, no leading number. */
function safeKey(key: string): string {
  const s = String(key).trim();
  if (!s) return "";
  const cleaned = s.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_");
  return cleaned.replace(/^(\d)/, "_$1") || "";
}

/** Convert a single value to string for Firestore metadata. */
function valueToString(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number" && !Number.isNaN(v)) return String(v);
  if (typeof v === "boolean") return String(v);
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString();
  if (Buffer.isBuffer(v) || (typeof v === "object" && v?.constructor?.name === "ArrayBuffer")) return null;
  if (typeof v === "object") return null;
  return String(v);
}

/** Build string-only metadata from all EXIF/XMP/etc. keys. */
function exifToMetadata(exif: Record<string, unknown> | null): Record<string, string> {
  if (!exif || typeof exif !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(exif)) {
    const k = safeKey(key);
    if (!k) continue;
    const s = valueToString(value);
    if (s != null) out[k] = s;
  }
  return out;
}

/** Get image dimensions (and format) from buffer using sharp. */
async function getImageDimensions(buffer: Buffer): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  try {
    const meta = await sharp(buffer).metadata();
    if (typeof meta.width === "number" && meta.width > 0) out.width = String(meta.width);
    if (typeof meta.height === "number" && meta.height > 0) out.height = String(meta.height);
    if (meta.format) out.format = String(meta.format);
    if (meta.orientation != null) out.orientation = String(meta.orientation);
    if (meta.space) out.space = String(meta.space);
    if (meta.channels != null) out.channels = String(meta.channels);
    if (meta.density != null) out.density = String(meta.density);
  } catch {
    // ignore
  }
  return out;
}

/** Build formatted filename: {base}.{width}x{height}.{ext}. Falls back to originalName if no dimensions. */
function formatUploadFilename(originalName: string, width: string | undefined, height: string | undefined, contentType: string): string {
  const safe = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, "_");
  const lastDot = originalName.lastIndexOf(".");
  const base = lastDot > 0 ? originalName.slice(0, lastDot) : originalName;
  const extFromName = lastDot > 0 ? originalName.slice(lastDot + 1).toLowerCase() : "";
  const extByType: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp", "image/avif": "avif" };
  const ext = extFromName || extByType[contentType] || contentType.replace("image/", "") || "jpg";
  if (width && height) {
    return `${safe(base)}.${width}x${height}.${ext}`;
  }
  return `${safe(originalName)}`.replace(/\s+/g, "_") || `image.${ext}`;
}

/** POST /api/admin/upload — upload one or more images to a gallery folder. Requires admin auth. */
export async function POST(request: Request) {
  try {
    await verifyAdminToken(request);

    const formData = await request.formData();
    const folder = sanitizeFolder((formData.get("folder") as string) ?? "");
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const bucket = getBucket();
    const uploaded: { name: string; path: string }[] = [];
    const errors: { name: string; error: string }[] = [];

    for (const file of files) {
      if (!(file instanceof File) || !file.name) {
        errors.push({ name: String(file?.name ?? "?"), error: "Invalid file" });
        continue;
      }
      const contentType = file.type || "image/jpeg";
      if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
        errors.push({ name: file.name, error: `Unsupported type: ${contentType}` });
        continue;
      }

      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const dimensions = await getImageDimensions(buffer);
        const safeName = formatUploadFilename(
          file.name,
          dimensions.width,
          dimensions.height,
          contentType
        );
        const storagePath = folder ? `${folder}/${safeName}` : safeName;

        const ref = bucket.file(storagePath);
        await ref.save(buffer, {
          contentType,
          metadata: { cacheControl: "public, max-age=31536000" },
        });
        uploaded.push({ name: file.name, path: storagePath });

        // Retain all available metadata (EXIF + dimensions) in Firestore
        try {
          const exif = await exifr.parse(buffer).catch(() => null) as Record<string, unknown> | null;
          const exifMeta = exifToMetadata(exif);
          const allMeta = { ...dimensions, ...exifMeta };
          if (Object.keys(allMeta).length > 0) {
            const db = getFirestore();
            const docRef = db.collection(IMAGE_STATS_COLLECTION).doc(toResourceId(storagePath));
            const snap = await docRef.get();
            const existing = (snap.data()?.metadata as Record<string, string> | undefined) ?? {};
            const merged = { ...existing, ...allMeta };
            await docRef.set({ metadata: merged }, { merge: true });
          }
        } catch {
          // Non-fatal: upload succeeded, metadata save is best-effort
        }
      } catch (e) {
        errors.push({ name: file.name, error: (e as Error).message });
      }
    }

    return NextResponse.json({ uploaded, errors });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    const message = status === 500 ? "Server error" : (err as Error).message;
    return NextResponse.json({ error: message }, { status });
  }
}
