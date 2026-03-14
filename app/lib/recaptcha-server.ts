/**
 * Server-side reCAPTCHA v3 verification.
 * Requires RECAPTCHA_SECRET_KEY in env.
 */

const SITE_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

export interface VerifyResult {
  success: boolean;
  score?: number;
  action?: string;
  errorCodes?: string[];
}

/** Minimum score (0–1) to consider the request human. reCAPTCHA v3 recommends 0.5. */
const MIN_SCORE = 0.5;

export async function verifyRecaptchaToken(token: string): Promise<VerifyResult> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    console.error("RECAPTCHA_SECRET_KEY is not set");
    return { success: false, errorCodes: ["missing-secret"] };
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  });

  const res = await fetch(SITE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = (await res.json()) as {
    success: boolean;
    score?: number;
    action?: string;
    "error-codes"?: string[];
  };

  const score = data.score ?? 0;
  const success = data.success === true && score >= MIN_SCORE;

  return {
    success,
    score: data.score,
    action: data.action,
    errorCodes: data["error-codes"],
  };
}
