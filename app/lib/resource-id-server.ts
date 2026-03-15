/**
 * Server-only: encode storage path to URL-safe resource id (same algorithm as client resource-id.ts).
 */

export function toResourceId(fullPath: string): string {
  const base64 = Buffer.from(fullPath, "utf8").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
