import { NextResponse } from "next/server";
import { getFirestore, ANALYTICS_EVENTS_COLLECTION } from "@/app/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const ALLOWED_EVENTS = new Set([
  "lightbox_opened",
  "lightbox_closed",
  "lightbox_navigate",
  "gallery_selected",
  "image_downloaded",
  "image_shared",
  "instagram_clicked",
  "buymeacoffee_clicked",
]);

/** POST { event, properties?, sessionId?, referrer? } — records an analytics event */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const event = typeof body?.event === "string" ? body.event.trim() : null;
    if (!event || !ALLOWED_EVENTS.has(event)) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    const rawProps = body?.properties;
    const properties: Record<string, string | number | boolean | null> =
      rawProps && typeof rawProps === "object" && !Array.isArray(rawProps)
        ? Object.fromEntries(
            Object.entries(rawProps).filter(
              ([k, v]) =>
                typeof k === "string" &&
                (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null)
            ) as [string, string | number | boolean | null][]
          )
        : {};

    const sessionId = typeof body?.sessionId === "string" ? body.sessionId.slice(0, 64) : null;
    const referrer = typeof body?.referrer === "string" ? body.referrer.slice(0, 512) : null;
    const env = body?.env === "development" ? "development" : "production";

    const rawMeta = body?.meta;
    const meta =
      rawMeta && typeof rawMeta === "object" && !Array.isArray(rawMeta)
        ? {
            url: typeof rawMeta.url === "string" ? rawMeta.url.slice(0, 512) : null,
            screen: typeof rawMeta.screen === "string" ? rawMeta.screen.slice(0, 32) : null,
            viewport: typeof rawMeta.viewport === "string" ? rawMeta.viewport.slice(0, 32) : null,
            language: typeof rawMeta.language === "string" ? rawMeta.language.slice(0, 16) : null,
            timezone: typeof rawMeta.timezone === "string" ? rawMeta.timezone.slice(0, 64) : null,
            connection: typeof rawMeta.connection === "string" ? rawMeta.connection.slice(0, 16) : null,
          }
        : null;

    // Server-side headers
    const ua = request.headers.get("user-agent")?.slice(0, 512) ?? null;
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim().slice(0, 45) ??
      request.headers.get("x-real-ip")?.slice(0, 45) ??
      null;

    const db = getFirestore();
    await db.collection(ANALYTICS_EVENTS_COLLECTION).add({
      event,
      properties,
      sessionId,
      referrer,
      env,
      meta,
      userAgent: ua,
      ip,
      timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("API analytics POST:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
