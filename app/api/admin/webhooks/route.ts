import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/app/lib/admin-auth";

function getPrintfulKey() {
  const key = process.env.PRINTFUL_API_KEY;
  if (!key) throw new Error("PRINTFUL_API_KEY is not set");
  return key;
}

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
}

function buildPrintfulWebhookUrl(siteUrl: string) {
  const base = siteUrl.replace(/\/$/, "");
  const secret = process.env.PRINTFUL_WEBHOOK_SECRET;
  return secret
    ? `${base}/api/webhooks/printful?secret=${encodeURIComponent(secret)}`
    : `${base}/api/webhooks/printful`;
}

/** GET — returns combined webhook status for Printful and Stripe. */
export async function GET(request: NextRequest) {
  try {
    await verifyAdminToken(request);

    let printful: { url: string; types: string[] } | null = null;
    if (process.env.PRINTFUL_API_KEY) {
      const res = await fetch("https://api.printful.com/webhooks", {
        headers: { Authorization: `Bearer ${getPrintfulKey()}` },
      });
      const data = await res.json();
      const r = data?.result;
      if (r?.url) {
        printful = { url: r.url, types: r.types ?? [] };
      }
    }

    return NextResponse.json({
      printful,
      stripe: {
        configured: !!process.env.STRIPE_WEBHOOK_SECRET,
        endpoint: `${getSiteUrl()}/api/webhooks/stripe`,
      },
      printfulSecretConfigured: !!process.env.PRINTFUL_WEBHOOK_SECRET,
      printfulApiKeyConfigured: !!process.env.PRINTFUL_API_KEY,
      siteUrl: getSiteUrl(),
    });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    const message = status === 500 ? "Server error" : (err as Error).message;
    return NextResponse.json({ error: message }, { status });
  }
}

/** POST — register/update the Printful webhook. Body: { types: string[] } */
export async function POST(request: NextRequest) {
  try {
    await verifyAdminToken(request);
    const body = await request.json();
    const types: string[] = Array.isArray(body?.types) ? body.types : ["package_shipped"];
    const siteUrl: string = body?.siteUrl ?? getSiteUrl();

    if (!siteUrl.startsWith("https://")) {
      return NextResponse.json(
        { error: "Site URL must be an https:// address that Printful can reach" },
        { status: 400 },
      );
    }

    const url = buildPrintfulWebhookUrl(siteUrl);
    const res = await fetch("https://api.printful.com/webhooks", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getPrintfulKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, types }),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message ?? "Printful error" },
        { status: res.status },
      );
    }
    return NextResponse.json({ url, types, result: data.result });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    const message = status === 500 ? "Server error" : (err as Error).message;
    return NextResponse.json({ error: message }, { status });
  }
}

/** DELETE — remove the Printful webhook. */
export async function DELETE(request: NextRequest) {
  try {
    await verifyAdminToken(request);
    const res = await fetch("https://api.printful.com/webhooks", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getPrintfulKey()}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: data?.error?.message ?? "Printful error" },
        { status: res.status },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    const message = status === 500 ? "Server error" : (err as Error).message;
    return NextResponse.json({ error: message }, { status });
  }
}
