import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/app/lib/admin-auth";
import { getFirestore, IMAGE_STATS_COLLECTION } from "@/app/lib/firebase-admin";

/** PATCH /api/admin/image-metadata — body { resourceId, metadata: { [key]: value } }. Merge into imageStats doc. Requires admin auth. */
export async function PATCH(request: Request) {
  try {
    await verifyAdminToken(request);
    const body = await request.json();
    const resourceId = typeof body?.resourceId === "string" ? body.resourceId.trim() : "";
    if (!resourceId) {
      return NextResponse.json({ error: "Missing resourceId" }, { status: 400 });
    }

    const incoming = body?.metadata;
    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
      return NextResponse.json({ error: "metadata must be an object" }, { status: 400 });
    }

    const merged: Record<string, string> = {};
    for (const [k, v] of Object.entries(incoming)) {
      if (typeof k === "string" && typeof v === "string") merged[k] = v;
    }

    const db = getFirestore();
    const docRef = db.collection(IMAGE_STATS_COLLECTION).doc(resourceId);
    const snap = await docRef.get();
    const existing = snap?.data()?.metadata;
    const existingMeta =
      existing && typeof existing === "object" && !Array.isArray(existing)
        ? Object.fromEntries(
            Object.entries(existing).filter(
              (e): e is [string, string] =>
                typeof e[0] === "string" && typeof e[1] === "string"
            )
          )
        : {};
    const metadata = { ...existingMeta, ...merged };
    await docRef.set({ metadata }, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    const message = status === 500 ? "Server error" : (err as Error).message;
    return NextResponse.json({ error: message }, { status });
  }
}
