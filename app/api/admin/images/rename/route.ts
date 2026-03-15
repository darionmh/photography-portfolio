import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/app/lib/admin-auth";
import { getFirestore, IMAGE_STATS_COLLECTION, renameFile } from "@/app/lib/firebase-admin";
import { toResourceId } from "@/app/lib/resource-id-server";

/** POST /api/admin/images/rename — body { fromPath: "folder/old.jpg", toName: "new.jpg" }. Renames file and copies Firestore metadata to new doc. */
export async function POST(request: Request) {
  try {
    await verifyAdminToken(request);
    const body = await request.json();
    const fromPath = typeof body?.fromPath === "string" ? body.fromPath.trim() : "";
    const toName = typeof body?.toName === "string" ? body.toName.trim() : "";
    if (!fromPath || !toName) {
      return NextResponse.json({ error: "Missing fromPath or toName" }, { status: 400 });
    }

    const newPath = await renameFile(fromPath, toName);
    const oldId = toResourceId(fromPath);
    const newId = toResourceId(newPath);

    const db = getFirestore();
    const oldRef = db.collection(IMAGE_STATS_COLLECTION).doc(oldId);
    const newRef = db.collection(IMAGE_STATS_COLLECTION).doc(newId);
    const oldSnap = await oldRef.get();
    if (oldSnap.exists) {
      const data = oldSnap.data();
      await newRef.set(data ?? {}, { merge: true });
      await oldRef.delete();
    }

    return NextResponse.json({ ok: true, newPath });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    const message = status === 500 ? "Server error" : (err as Error).message;
    return NextResponse.json({ error: message }, { status });
  }
}
