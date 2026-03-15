/**
 * Server-only: verify Firebase ID token. Any authenticated user is treated as admin.
 * Use in admin API routes. Expects Authorization: Bearer <idToken>.
 */

import { getAdminAuth } from "./firebase-admin";

function getBearerToken(request: Request): string | null {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice(7).trim() || null;
}

export interface VerifiedAdmin {
  uid: string;
  email: string | undefined;
}

/**
 * Verifies the request has a valid Firebase ID token. Any logged-in user has admin rights.
 * Returns the decoded token info; throws 401 if missing or invalid token.
 */
export async function verifyAdminToken(request: Request): Promise<VerifiedAdmin> {
  const token = getBearerToken(request);
  if (!token) {
    const err = new Error("Missing or invalid Authorization header");
    (err as Error & { status?: number }).status = 401;
    throw err;
  }

  const auth = getAdminAuth();
  let decoded: { uid: string; email?: string };
  try {
    decoded = await auth.verifyIdToken(token);
  } catch {
    const err = new Error("Invalid or expired token");
    (err as Error & { status?: number }).status = 401;
    throw err;
  }

  return { uid: decoded.uid, email: decoded.email };
}
