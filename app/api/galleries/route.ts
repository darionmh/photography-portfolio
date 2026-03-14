import { NextResponse } from "next/server";
import { verifyRecaptchaToken } from "@/app/lib/recaptcha-server";
import { getFolderNames } from "@/app/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = typeof body?.token === "string" ? body.token : null;
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

    const galleries = await getFolderNames("");
    return NextResponse.json({ galleries });
  } catch (err) {
    console.error("API galleries:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
