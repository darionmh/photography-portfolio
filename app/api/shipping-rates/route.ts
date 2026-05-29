import { NextRequest, NextResponse } from "next/server";

export interface ShippingRate {
  id: string;
  name: string;
  rate: string;
  currency: string;
  minDeliveryDays: number | null;
  maxDeliveryDays: number | null;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.PRINTFUL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Printful not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { countryCode, stateCode, zip, items } = body;

    if (!countryCode || !items?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const recipient: Record<string, string> = {
      address1: "123 Main St",
      country_code: countryCode,
      zip: zip ?? "",
    };
    if (stateCode) recipient.state_code = stateCode;

    const res = await fetch("https://api.printful.com/shipping/rates", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient,
        items: items.map((i: { variantId: number; quantity: number }) => ({
          sync_variant_id: i.variantId,
          quantity: i.quantity,
        })),
        currency: "USD",
        locale: "en_US",
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err?.error?.message ?? "Failed to fetch shipping rates" },
        { status: res.status },
      );
    }

    const data = await res.json();
    const rates: ShippingRate[] = (data.result ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r: any) => ({
        id: r.id,
        name: r.name,
        rate: r.rate,
        currency: r.currency,
        minDeliveryDays: r.minDeliveryDays ?? null,
        maxDeliveryDays: r.maxDeliveryDays ?? null,
      }),
    );

    return NextResponse.json({ rates });
  } catch (err) {
    console.error("POST /api/shipping-rates:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
