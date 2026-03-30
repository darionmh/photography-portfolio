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

const IMAGE_STATS_COLLECTION = "imageStats";
const ANALYTICS_EVENTS_COLLECTION = "analyticsEvents";

function ensureAdmin() {
  if (!admin.apps.length) {
    const cred = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!cred) {
      throw new Error("Firebase Admin: FIREBASE_SERVICE_ACCOUNT_JSON is not set");
    }
    try {
      const serviceAccount = JSON.parse(cred) as admin.ServiceAccount;
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } catch (e) {
      console.error("Invalid FIREBASE_SERVICE_ACCOUNT_JSON", e);
      throw new Error("Firebase Admin: invalid service account");
    }
  }
}

/** Storage bucket for uploads and listing. Requires Firebase Admin init. */
export function getBucket() {
  ensureAdmin();
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET || "photogallery-62b63.firebasestorage.app";
  return admin.storage().bucket(bucketName);
}

/** Auth instance for verifying ID tokens (e.g. admin APIs). Requires Firebase Admin init. */
export function getAdminAuth() {
  ensureAdmin();
  return admin.auth();
}

/** Firestore instance for image stats. Requires Firebase Admin init (e.g. FIREBASE_SERVICE_ACCOUNT_JSON). */
export function getFirestore() {
  ensureAdmin();
  return admin.firestore();
}

export { IMAGE_STATS_COLLECTION, ANALYTICS_EVENTS_COLLECTION };

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
  results.sort((a, b) => (b.timeCreated || "").localeCompare(a.timeCreated || ""));
  return results;
}

/** Segment can contain spaces and common filename chars; no path traversal, no control chars, no \ or /. */
const PATH_SEGMENT_REGEX = /^[^\x00-\x1f\/\\]+$/;

/** Sanitize storage path: no "..", no empty segments. Returns empty string if invalid. */
export function sanitizeStoragePath(raw: string): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "";
  const segments = trimmed.split("/").filter(Boolean);
  if (segments.length === 0) return "";
  if (segments.some((s) => s === ".." || !PATH_SEGMENT_REGEX.test(s))) return "";
  return segments.join("/");
}

/** Delete a single file by full storage path. Path must be sanitized. */
export async function deleteFile(fullPath: string): Promise<void> {
  const path = sanitizeStoragePath(fullPath);
  if (!path) throw new Error("Invalid path");
  const bucket = getBucket();
  await bucket.file(path).delete();
}

const FILENAME_REGEX = /^[a-zA-Z0-9_.-]+$/;

/** Sanitize a filename (no path, no slashes). Returns empty string if invalid. */
export function sanitizeFilename(raw: string): string {
  const name = (raw ?? "").trim();
  if (!name || name.includes("/") || name.includes("..")) return "";
  return FILENAME_REGEX.test(name) ? name : name.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

/** Rename a single file: copy to new path, delete original. toName is filename only (same folder). */
export async function renameFile(fromPath: string, toName: string): Promise<string> {
  const from = sanitizeStoragePath(fromPath);
  if (!from) throw new Error("Invalid path");
  const name = sanitizeFilename(toName);
  if (!name) throw new Error("Invalid filename");
  const lastSlash = from.lastIndexOf("/");
  const dir = lastSlash >= 0 ? from.slice(0, lastSlash) : "";
  const toPath = dir ? `${dir}/${name}` : name;
  if (from === toPath) throw new Error("Same path");
  const bucket = getBucket();
  const src = bucket.file(from);
  const dest = bucket.file(toPath);
  await src.copy(dest);
  await src.delete();
  return toPath;
}

/** Rename (move) a folder: copy all files to new path, then delete originals. */
export async function renameFolder(from: string, to: string): Promise<number> {
  const fromPath = sanitizeStoragePath(from);
  const toPath = sanitizeStoragePath(to);
  if (!fromPath || !toPath) throw new Error("Invalid folder path");
  if (fromPath === toPath) throw new Error("Source and destination are the same");
  const bucket = getBucket();
  const prefix = fromPath.endsWith("/") ? fromPath : `${fromPath}/`;
  const [files] = await bucket.getFiles({ prefix });
  const toPrefix = toPath.endsWith("/") ? toPath : `${toPath}/`;
  let count = 0;
  for (const file of files) {
    if (!file.name.startsWith(prefix) || file.name === prefix) continue;
    const relative = file.name.slice(prefix.length);
    if (!relative || relative.includes("..")) continue;
    const destPath = toPrefix + relative;
    const dest = bucket.file(destPath);
    await file.copy(dest);
    await file.delete();
    count++;
  }
  return count;
}

/** Delete a folder and all files under it. Returns number of files deleted. */
export async function deleteFolder(path: string): Promise<number> {
  const safe = sanitizeStoragePath(path);
  if (!safe) throw new Error("Invalid path");
  const bucket = getBucket();
  const prefix = safe.endsWith("/") ? safe : `${safe}/`;
  const [files] = await bucket.getFiles({ prefix });
  let count = 0;
  for (const file of files) {
    if (!file.name.startsWith(prefix) || file.name === prefix) continue;
    await file.delete();
    count++;
  }
  return count;
}
