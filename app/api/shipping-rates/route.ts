import { NextRequest, NextResponse } from "next/server";
import { fetchShippingRates } from "@/app/lib/printful";

export async function POST(request: NextRequest) {
  if (!process.env.PRINTFUL_API_KEY) {
    return NextResponse.json({ error: "Printful not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { countryCode, stateCode, zip, items } = body;

    if (!countryCode || !items?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const rawRates = await fetchShippingRates(
      countryCode,
      stateCode ?? "",
      zip ?? "",
      (items as { variantId: number; quantity: number }[]).map((i) => ({
        syncVariantId: i.variantId,
        quantity: i.quantity,
      })),
    );

    // Mark cheapest US rate as free — business rule applied here for the UI
    const rates = rawRates.map((r) => ({ ...r, isFree: false }));
    if (countryCode === "US" && rates.length > 0) {
      const minIdx = rates.reduce(
        (mi, r, i, a) => parseFloat(r.rate) < parseFloat(a[mi].rate) ? i : mi,
        0,
      );
      rates[minIdx] = { ...rates[minIdx], isFree: true };
    }

    return NextResponse.json({ rates });
  } catch (err) {
    console.error("POST /api/shipping-rates:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}
