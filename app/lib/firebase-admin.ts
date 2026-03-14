/**
 * Server-only Firebase Admin helpers for listing galleries and images.
 * Requires FIREBASE_SERVICE_ACCOUNT_JSON (stringified JSON) or GOOGLE_APPLICATION_CREDENTIALS.
 */

import * as admin from "firebase-admin";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"];
const DIMENSIONS_REGEX = /^(.+)\.(\d+)x(\d+)\.([a-zA-Z]+)$/;

export interface ParsedDimensions {
  baseName: string;
  width: number;
  height: number;
  ratio: number;
  extension: string;
}

export interface StorageImageServer {
  url: string;
  name: string;
  fullPath: string;
  size: number;
  contentType: string;
  timeCreated: string;
  updated: string;
  metadata: Record<string, unknown>;
  dimensions: ParsedDimensions | null;
}

function getBucket() {
  if (!admin.apps.length) {
    const cred = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (cred) {
      try {
        const serviceAccount = JSON.parse(cred) as admin.ServiceAccount;
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      } catch (e) {
        console.error("Invalid FIREBASE_SERVICE_ACCOUNT_JSON", e);
        throw new Error("Firebase Admin: invalid service account");
      }
    } else {
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
    }
  }
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET || "photogallery-62b63.firebasestorage.app";
  return admin.storage().bucket(bucketName);
}

function parseDimensions(name: string): ParsedDimensions | null {
  const match = name.match(DIMENSIONS_REGEX);
  if (!match) return null;
  const [, baseName, w, h, extension] = match;
  const width = parseInt(w, 10);
  const height = parseInt(h, 10);
  if (Number.isNaN(width) || Number.isNaN(height) || height === 0) return null;
  return { baseName, width, height, ratio: width / height, extension };
}

function isImageFile(name: string): boolean {
  const lower = name.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** List immediate subfolder names at the given path (e.g. "" for bucket root). */
export async function getFolderNames(path: string = ""): Promise<string[]> {
  const bucket = getBucket();
  const prefix = path ? `${path.replace(/\/$/, "")}/` : "";
  try {
    const [files, apiResponse] = await bucket.getFiles({
      prefix,
      delimiter: "/",
      autoPaginate: true,
    });
    const rawPrefixes = (apiResponse as { prefixes?: string[] } | undefined)?.prefixes ?? [];
    if (rawPrefixes.length > 0) {
      return rawPrefixes.map((p) => p.replace(/\/$/, "").split("/").pop() ?? p).filter(Boolean);
    }
  } catch {
    // delimiter/prefixes path failed, use fallback
  }
  // Fallback: list all files under prefix and derive folder names from paths
  const [allFiles] = await bucket.getFiles({ prefix, autoPaginate: true });
  const firstSegments = new Set<string>();
  for (const file of allFiles) {
    const relative = prefix ? file.name.slice(prefix.length) : file.name;
    if (!relative.includes("/")) continue; // file at this level, not in a subfolder
    firstSegments.add(relative.split("/")[0]);
  }
  return Array.from(firstSegments).sort();
}

/** Get all images under path (recursive) with signed URLs (1h) and metadata. */
export async function getImagesInPath(path: string = ""): Promise<StorageImageServer[]> {
  const bucket = getBucket();
  const prefix = path ? `${path.replace(/\/$/, "")}/` : "";
  const [allFiles] = await bucket.getFiles({ prefix });
  const imageFiles = allFiles.filter((f) => !f.name.endsWith("/") && isImageFile(f.name.split("/").pop() ?? ""));

  const expires = new Date(Date.now() + 60 * 60 * 1000);
  const results = await Promise.all(
    imageFiles.map(async (file): Promise<StorageImageServer> => {
      const [metaTuple, [signedUrl]] = await Promise.all([
        file.getMetadata(),
        file.getSignedUrl({ action: "read", expires }),
      ]);
      const meta = (Array.isArray(metaTuple) ? metaTuple[0] : metaTuple) as Record<string, unknown>;
      const name = file.name.split("/").pop() ?? file.name;
      const dimensions = parseDimensions(name);
      return {
        url: signedUrl,
        name,
        fullPath: file.name,
        size: Number(meta.size ?? 0),
        contentType: String(meta.contentType ?? ""),
        timeCreated: String(meta.timeCreated ?? ""),
        updated: String(meta.updated ?? ""),
        metadata: meta,
        dimensions,
      };
    })
  );
  results.sort((a, b) => a.fullPath.localeCompare(b.fullPath));
  return results;
}
