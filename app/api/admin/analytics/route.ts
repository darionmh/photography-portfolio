import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/app/lib/admin-auth";
import { getFirestore, ANALYTICS_EVENTS_COLLECTION } from "@/app/lib/firebase-admin";
import type { Timestamp } from "firebase-admin/firestore";

export interface AnalyticsEventMeta {
  url: string | null;
  screen: string | null;
  viewport: string | null;
  language: string | null;
  timezone: string | null;
  connection: string | null;
}

export interface AnalyticsEvent {
  id: string;
  event: string;
  properties: Record<string, string | number | boolean | null>;
  sessionId: string | null;
  referrer: string | null;
  env: "development" | "production";
  userAgent: string | null;
  ip: string | null;
  meta: AnalyticsEventMeta | null;
  timestamp: string; // ISO string
}

export interface AnalyticsSummary {
  counts: Record<string, number>;
  recent: AnalyticsEvent[];
  total: number;
}

/**
 * GET /api/admin/analytics
 * Query params:
 *   limit  — number of recent events to return (default 50, max 200)
 *   event  — filter by event name (optional)
 */
export async function GET(request: Request) {
  try {
    await verifyAdminToken(request);

    const { searchParams } = new URL(request.url);
    const rawLimit = parseInt(searchParams.get("limit") ?? "50", 10);
    const pageLimit = Math.min(isNaN(rawLimit) ? 50 : rawLimit, 200);
    const eventFilter = searchParams.get("event");

    const db = getFirestore();
    let col = db.collection(ANALYTICS_EVENTS_COLLECTION) as FirebaseFirestore.Query;

    if (eventFilter) {
      col = col.where("event", "==", eventFilter);
    }

    // Fetch recent events for the table
    const recentSnap = await col
      .orderBy("timestamp", "desc")
      .limit(pageLimit)
      .get();

    const recent: AnalyticsEvent[] = recentSnap.docs.map((doc) => {
      const d = doc.data();
      const ts = d.timestamp as Timestamp | null;
      return {
        id: doc.id,
        event: String(d.event ?? ""),
        properties: (d.properties ?? {}) as Record<string, string | number | boolean | null>,
        sessionId: d.sessionId ?? null,
        referrer: d.referrer ?? null,
        env: d.env === "development" ? "development" : "production",
        userAgent: d.userAgent ?? null,
        ip: d.ip ?? null,
        meta: d.meta ?? null,
        timestamp: ts ? ts.toDate().toISOString() : "",
      };
    });

    // Fetch per-event counts (aggregate over all time, no filter)
    const countsSnap = await db.collection(ANALYTICS_EVENTS_COLLECTION).get();
    const counts: Record<string, number> = {};
    countsSnap.docs.forEach((doc) => {
      const ev = String(doc.data().event ?? "unknown");
      counts[ev] = (counts[ev] ?? 0) + 1;
    });

    return NextResponse.json({
      counts,
      recent,
      total: countsSnap.size,
    } satisfies AnalyticsSummary);
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    const message = status === 500 ? "Server error" : (err as Error).message;
    return NextResponse.json({ error: message }, { status });
  }
}
