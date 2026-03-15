import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/app/lib/admin-auth";
import { renameFolder, sanitizeStoragePath } from "@/app/lib/firebase-admin";

/** POST /api/admin/folders/rename — body { from: "oldName", to: "newName" }. Requires admin auth. */
export async function POST(request: Request) {
  try {
    await verifyAdminToken(request);
    const body = await request.json();
    const from =
      typeof body?.from === "string" ? sanitizeStoragePath(body.from.trim()) : "";
    const to =
      typeof body?.to === "string" ? sanitizeStoragePath(body.to.trim()) : "";
    if (!from || !to) {
      return NextResponse.json(
        { error: "Missing or invalid from/to folder names" },
        { status: 400 }
      );
    }
    const count = await renameFolder(from, to);
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    const message = status === 500 ? "Server error" : (err as Error).message;
    return NextResponse.json({ error: message }, { status });
  }
}
