import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/app/lib/admin-auth";
import { getFolderNames } from "@/app/lib/firebase-admin";

/** GET /api/admin/galleries — list gallery (folder) names. Requires admin auth. */
export async function GET(request: Request) {
  try {
    await verifyAdminToken(request);
    const galleries = await getFolderNames("");
    return NextResponse.json({ galleries });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    const message = status === 500 ? "Server error" : (err as Error).message;
    return NextResponse.json({ error: message }, { status });
  }
}
