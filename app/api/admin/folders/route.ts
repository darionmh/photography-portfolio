import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/app/lib/admin-auth";
import { deleteFolder, sanitizeStoragePath } from "@/app/lib/firebase-admin";

/** DELETE /api/admin/folders — body { path: "folderName" }. Deletes folder and all its images. Requires admin auth. */
export async function DELETE(request: Request) {
  try {
    await verifyAdminToken(request);
    const body = await request.json();
    const path =
      typeof body?.path === "string" ? body.path.trim() : "";
    const safe = sanitizeStoragePath(path);
    if (!safe) {
      return NextResponse.json(
        { error: "Missing or invalid path" },
        { status: 400 }
      );
    }
    const count = await deleteFolder(safe);
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    const message = status === 500 ? "Server error" : (err as Error).message;
    return NextResponse.json({ error: message }, { status });
  }
}
