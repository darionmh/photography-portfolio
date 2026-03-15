import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/app/lib/admin-auth";
import {
  getImagesInPath,
  deleteFile,
  sanitizeStoragePath,
} from "@/app/lib/firebase-admin";

/** GET /api/admin/images?path=folderName — list images in folder. Requires admin auth. */
export async function GET(request: Request) {
  try {
    await verifyAdminToken(request);
    const { searchParams } = new URL(request.url);
    const path = sanitizeStoragePath(searchParams.get("path") ?? "");
    const images = await getImagesInPath(path);
    return NextResponse.json({ images });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    const message = status === 500 ? "Server error" : (err as Error).message;
    return NextResponse.json({ error: message }, { status });
  }
}

/** DELETE /api/admin/images — body { path: "folder/filename.jpg" }. Requires admin auth. */
export async function DELETE(request: Request) {
  try {
    await verifyAdminToken(request);
    const body = await request.json();
    const path =
      typeof body?.path === "string" ? body.path.trim() : "";
    const safe = sanitizeStoragePath(path);
    if (!safe) {
      return NextResponse.json({ error: "Invalid or missing path" }, { status: 400 });
    }
    await deleteFile(safe);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    const message = status === 500 ? "Server error" : (err as Error).message;
    return NextResponse.json({ error: message }, { status });
  }
}
