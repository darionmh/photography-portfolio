/** Encode storage fullPath to a URL-safe resource id (deep linking, stats, metadata). */
export function toResourceId(fullPath: string): string {
  const base64 = btoa(unescape(encodeURIComponent(fullPath)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decode resource id back to storage fullPath. */
export function fromResourceId(id: string): string | null {
  try {
    const base64 = id.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
    return decodeURIComponent(escape(atob(padded)));
  } catch {
    return null;
  }
}
