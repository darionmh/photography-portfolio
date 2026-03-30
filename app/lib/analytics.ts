/**
 * Client-side analytics utility. Replaces @vercel/analytics track() with a
 * homebrew version that writes events to Firestore via /api/analytics.
 */

function getSessionId(): string {
  if (typeof sessionStorage === "undefined") return "";
  const key = "__sid";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(key, id);
  }
  return id;
}

export type TrackProperties = Record<string, string | number | boolean | null | undefined>;

interface ClientMeta {
  url: string;
  screen: string;
  viewport: string;
  language: string;
  timezone: string;
  connection: string | null;
}

function getEnv(): "development" | "production" {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host.startsWith("192.168.") ? "development" : "production";
}

function getClientMeta(): ClientMeta {
  const nav = navigator as Navigator & { connection?: { effectiveType?: string } };
  return {
    url: window.location.pathname + window.location.search,
    screen: `${screen.width}x${screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    connection: nav.connection?.effectiveType ?? null,
  };
}

export function track(event: string, properties?: TrackProperties): void {
  if (typeof window === "undefined") return;
  const payload = {
    event,
    properties: properties ?? {},
    sessionId: getSessionId(),
    referrer: document.referrer || null,
    env: getEnv(),
    meta: getClientMeta(),
  };
  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    // fire-and-forget — don't block the interaction
    keepalive: true,
  }).catch(() => {});
}

/** Defer to after next paint to keep interaction handlers fast (INP). */
export function deferredTrack(event: string, properties?: TrackProperties): void {
  if (typeof requestAnimationFrame !== "undefined") {
    requestAnimationFrame(() => track(event, properties));
  } else {
    track(event, properties);
  }
}
