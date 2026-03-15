import { NextResponse } from "next/server";
import { getFirestore, IMAGE_STATS_COLLECTION } from "@/app/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export interface ImageStats {
  downloads: number;
  shares: number;
  metadata?: Record<string, string>;
}

/** GET ?ids=id1,id2 — returns { [id]: { downloads, shares, metadata?: { [key]: value } } } */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");
    if (!idsParam || typeof idsParam !== "string") {
      return NextResponse.json({ stats: {} });
    }
    const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) return NextResponse.json({ stats: {} });
    if (ids.length > 100) ids.splice(100);

    const db = getFirestore();
    const col = db.collection(IMAGE_STATS_COLLECTION);
    const snapshots = await Promise.all(ids.map((id) => col.doc(id).get()));

    const stats: Record<string, ImageStats> = {};
    ids.forEach((id, i) => {
      const snap = snapshots[i];
      const data = snap?.data();
      const rawMeta = data?.metadata;
      let metadata: Record<string, string> =
        rawMeta && typeof rawMeta === "object" && !Array.isArray(rawMeta)
          ? Object.fromEntries(
              Object.entries(rawMeta).filter(
                (e): e is [string, string] =>
                  typeof e[0] === "string" && typeof e[1] === "string"
              )
            )
          : {};
      // Backward compat: old docs had top-level alt, caption, title
      if (typeof data?.alt === "string") metadata.alt = data.alt;
      if (typeof data?.caption === "string") metadata.caption = data.caption;
      if (typeof data?.title === "string") metadata.title = data.title;
      stats[id] = {
        downloads: Number(data?.downloads ?? 0),
        shares: Number(data?.shares ?? 0),
        ...(Object.keys(metadata).length > 0 && { metadata }),
      };
    });
    return NextResponse.json({ stats });
  } catch (err) {
    console.error("API image-stats GET:", err);
    return NextResponse.json({ error: "Server error", stats: {} }, { status: 500 });
  }
}

/** POST { resourceId, action: "download" | "share" } — increments and returns { downloads, shares } */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const resourceId = typeof body?.resourceId === "string" ? body.resourceId.trim() : null;
    const action = body?.action === "download" || body?.action === "share" ? body.action : null;

    if (!resourceId || !action) {
      return NextResponse.json({ error: "Missing resourceId or action" }, { status: 400 });
    }

    const db = getFirestore();
    const docRef = db.collection(IMAGE_STATS_COLLECTION).doc(resourceId);
    const field = action === "download" ? "downloads" : "shares";
    await docRef.set(
      { [field]: FieldValue.increment(1) },
      { merge: true }
    );
    const snap = await docRef.get();
    const data = snap.data();
    const downloads = Number(data?.downloads ?? 0);
    const shares = Number(data?.shares ?? 0);
    return NextResponse.json({ downloads, shares });
  } catch (err) {
    console.error("API image-stats POST:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
