import { NextRequest, NextResponse } from "next/server";
import { getFirestore, IMAGE_STATS_COLLECTION } from "@/app/lib/firebase-admin";
import { getStripe } from "@/app/lib/stripe";
import { createPendingOrder, type PendingCartItem } from "@/app/lib/orders";
import { createDraftPrintfulOrder, type PrintfulRecipient } from "@/app/lib/printful";
import type Stripe from "stripe";

async function getPrintfulVariantPriceCents(
  variantId: number,
): Promise<number> {
  const apiKey = process.env.PRINTFUL_API_KEY;
  if (!apiKey) {
    console.error("[checkout] PRINTFUL_API_KEY not set");
    return 0;
  }
  try {
    const url = `https://api.printful.com/store/variants/${variantId}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 300 },
    });
    const data = await res.json();
    if (!res.ok) return 0;
    const price = parseFloat(data?.result?.retail_price ?? "0");
    return Math.round(price * 100);
  } catch (err) {
    console.error("[checkout] Printful variant fetch failed:", err);
    return 0;
  }
}

interface ShippingAddress {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state?: string;
  country: string;
  zip: string;
}

interface CartItemInput {
  resourceId: string;
  variantId: number;
  quantity: number;
  title: string;
  size: string;
  imageUrl?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawItems: CartItemInput[] = Array.isArray(body?.items) ? body.items : [];
    const addr: ShippingAddress | undefined = body?.shippingAddress;

    if (rawItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    if (
      !addr?.name?.trim() ||
      !addr?.address1?.trim() ||
      !addr?.city?.trim() ||
      !addr?.country?.trim() ||
      !addr?.zip?.trim()
    ) {
      return NextResponse.json({ error: "Shipping address is incomplete" }, { status: 400 });
    }

    const db = getFirestore();
    const stripe = getStripe();

    const pendingItems: PendingCartItem[] = [];
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    for (const item of rawItems) {
      if (!item.resourceId || !item.variantId || !item.quantity || !item.title) {
        return NextResponse.json({ error: "Invalid item data" }, { status: 400 });
      }

      const doc = await db
        .collection(IMAGE_STATS_COLLECTION)
        .doc(item.resourceId)
        .get();
      const meta: Record<string, string> = doc.data()?.metadata ?? {};

      let priceInCents = parseInt(meta.price ?? "", 10);

      if (!priceInCents || isNaN(priceInCents) || priceInCents <= 0) {
        priceInCents = await getPrintfulVariantPriceCents(item.variantId);
      }

      if (!priceInCents || priceInCents <= 0) {
        return NextResponse.json(
          { error: `Price not available for "${item.title}". Please contact the store.` },
          { status: 400 },
        );
      }

      pendingItems.push({
        resourceId: item.resourceId,
        variantId: item.variantId,
        quantity: item.quantity,
        title: item.title,
        priceInCents,
      });

      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: `${item.title} — ${item.size}`,
            ...(item.imageUrl ? { images: [item.imageUrl] } : {}),
          },
          unit_amount: priceInCents,
        },
        quantity: item.quantity,
      });
    }

    const recipient: PrintfulRecipient = {
      name: addr.name.trim(),
      address1: addr.address1.trim(),
      ...(addr.address2?.trim() ? { address2: addr.address2.trim() } : {}),
      city: addr.city.trim(),
      ...(addr.state?.trim() ? { state_code: addr.state.trim() } : {}),
      country_code: addr.country.trim().toUpperCase(),
      zip: addr.zip.trim(),
    };

    const printfulDraft = await createDraftPrintfulOrder(
      recipient,
      pendingItems.map((i) => ({ sync_variant_id: i.variantId, quantity: i.quantity })),
    );

    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
    ).replace(/\/$/, "");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${siteUrl}/prints/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cart`,
    });

    await createPendingOrder(session.id, pendingItems, printfulDraft.id, recipient);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("POST /api/checkout:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
