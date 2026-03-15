"use client";

import { ref, listAll, getDownloadURL, getMetadata } from "firebase/storage";
import type { FullMetadata } from "firebase/storage";
import type { StorageReference } from "firebase/storage";
import { storage } from "./firebase";

/** Supported image extensions when filtering from storage. */
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"];

/** Matches filenames like "photo.1920x1080.jpg" → filename, width, height, extension */
const DIMENSIONS_REGEX = /^(.+)\.(\d+)x(\d+)\.([a-zA-Z]+)$/;

export interface ParsedDimensions {
  /** Base filename without dimensions or extension (e.g. "photo"). */
  baseName: string;
  /** Width in pixels. */
  width: number;
  /** Height in pixels. */
  height: number;
  /** Aspect ratio (width / height). */
  ratio: number;
  /** File extension (e.g. "jpg"). */
  extension: string;
}

/**
 * Parses a filename in the format {filename}.{width}x{height}.{extension}.
 * Returns null if the filename does not match.
 */
function parseDimensionsFromName(name: string): ParsedDimensions | null {
  const match = name.match(DIMENSIONS_REGEX);
  if (!match) return null;
  const [, baseName, w, h, extension] = match;
  const width = parseInt(w, 10);
  const height = parseInt(h, 10);
  if (Number.isNaN(width) || Number.isNaN(height) || height === 0) return null;
  return {
    baseName,
    width,
    height,
    ratio: width / height,
    extension,
  };
}

/** Image entry returned from storage, with URL and metadata. */
export interface StorageImage {
  /** Public download URL for the image. */
  url: string;
  /** File name (e.g. "photo.1920x1080.jpg"). */
  name: string;
  /** Full path in the bucket (e.g. "gallery/photo.1920x1080.jpg"). */
  fullPath: string;
  /** Size in bytes. */
  size: number;
  /** MIME type (e.g. "image/jpeg"). */
  contentType: string;
  /** ISO date string when the object was created. */
  timeCreated: string;
  /** ISO date string when the object was last updated. */
  updated: string;
  /** Raw Firebase metadata for custom fields (e.g. customMetadata). */
  metadata: FullMetadata;
  /**
   * Parsed dimensions when filename follows {filename}.{width}x{height}.{extension}.
   * null when the filename does not match that format.
   */
  dimensions: ParsedDimensions | null;
}

function isImageRef(itemRef: StorageReference): boolean {
  const name = itemRef.name.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/**
 * Returns the names of immediate subfolders at the given path (e.g. for use as galleries).
 *
 * @param path - Storage path to list (e.g. "" for bucket root).
 * @returns Array of folder names.
 */
export async function getStorageFolderNames(path: string = ""): Promise<string[]> {
  const storageRef = ref(storage, path);
  const result = await listAll(storageRef);
  return result.prefixes.map((p) => p.name);
}

/**
 * Recursively collects all image refs under a storage path (including subfolders).
 */
async function collectImageRefs(
  path: string,
  refs: StorageReference[] = []
): Promise<StorageReference[]> {
  const storageRef = ref(storage, path);
  const result = await listAll(storageRef);

  const imageItems = result.items.filter(isImageRef);
  refs.push(...imageItems);

  await Promise.all(
    result.prefixes.map((prefixRef) =>
      collectImageRefs(prefixRef.fullPath, refs)
    )
  );

  return refs;
}

/**
 * Fetches all images in a Firebase Storage path with download URLs and metadata.
 * Recursively searches all subfolders. Returns URL + filename, size, and metadata for image files.
 *
 * @param path - Storage path (e.g. "gallery" or "images/2024"). Defaults to "" (bucket root).
 * @returns Array of image objects with url, name, size, and metadata.
 */
export async function getImagesFromStorage(
  path: string = ""
): Promise<StorageImage[]> {
  const imageRefs = await collectImageRefs(path);

  const imagePromises = imageRefs.map(async (itemRef): Promise<StorageImage> => {
    const [url, metadata] = await Promise.all([
      getDownloadURL(itemRef),
      getMetadata(itemRef),
    ]);

    const dimensions = parseDimensionsFromName(metadata.name);

    return {
      url,
      name: metadata.name,
      fullPath: metadata.fullPath,
      size: metadata.size,
      contentType: metadata.contentType ?? "",
      timeCreated: metadata.timeCreated,
      updated: metadata.updated,
      metadata,
      dimensions,
    };
  });

  const images = await Promise.all(imagePromises);
  images.sort((a, b) => (b.timeCreated || "").localeCompare(a.timeCreated || ""));
  return images;
}
