/**
 * Server-only: encode storage path to URL-safe resource id.
 * Produces the same output as client resource-id.ts — both base64-encode the UTF-8 bytes of the path.
 */

export function toResourceId(fullPath: string): string {
  const base64 = Buffer.from(fullPath, "utf8").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
