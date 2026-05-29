/**
 * Server-only: encode/decode storage path ↔ URL-safe resource id.
 * Produces the same output as client resource-id.ts — both base64-encode the UTF-8 bytes of the path.
 */

export function toResourceId(fullPath: string): string {
  const base64 = Buffer.from(fullPath, "utf8").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromResourceId(id: string): string | null {
  try {
    const base64 = id.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
    return Buffer.from(padded, "base64").toString("utf8");
  } catch {
    return null;
  }
}
