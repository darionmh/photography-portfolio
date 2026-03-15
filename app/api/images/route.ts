import { NextResponse } from "next/server";
import { verifyRecaptchaToken } from "@/app/lib/recaptcha-server";
import { getImagesInPath } from "@/app/lib/firebase-admin";

// Optional: add rate limiting (e.g. Upstash Redis) to throttle requests per IP.

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = typeof body?.token === "string" ? body.token : null;
    const path = typeof body?.path === "string" ? body.path : "";

    if (!token) {
      return NextResponse.json({ error: "Missing reCAPTCHA token" }, { status: 400 });
    }

    const result = await verifyRecaptchaToken(token);
    if (!result.success) {
      return NextResponse.json(
        { error: "reCAPTCHA verification failed", score: result.score },
        { status: 403 }
      );
    }

    const images = await getImagesInPath(path);
    return NextResponse.json({ images });
  } catch (err) {
    console.error("API images:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
