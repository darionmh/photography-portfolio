import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/app/lib/stripe";
import { getPendingOrder, fulfillOrder } from "@/app/lib/orders";
import { confirmPrintfulOrder, updatePrintfulRecipientEmail } from "@/app/lib/printful";
import { sendOrderConfirmed } from "@/app/lib/email";

// Disable body parsing so we can read the raw bytes for signature verification.
export const config = { api: { bodyParser: false } };

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const stripe = getStripe();
    if (webhookSecret) {
      if (!sig) {
        return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
      }
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) {
        console.error("STRIPE_WEBHOOK_SECRET must be set in production");
        return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
      }
      console.warn("[TEST MODE] Skipping webhook signature verification — set STRIPE_WEBHOOK_SECRET to enable it");
      event = JSON.parse(body);
    }
  } catch (err) {
    console.error("Stripe webhook error:", err);
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const order = await getPendingOrder(session.id);
    if (!order) {
      console.error("No pending order for session:", session.id);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Idempotency guard: skip if already fulfilled
    if (order.status === "paid") {
      return NextResponse.json({ received: true });
    }

    if (order.printfulDraftOrderId == null) {
      console.error("No Printful draft order ID for session:", session.id);
      return NextResponse.json({ error: "Draft order ID missing" }, { status: 500 });
    }

    try {
      const email: string | null | undefined = session.customer_details?.email;
      if (email) {
        await updatePrintfulRecipientEmail(order.printfulDraftOrderId, email);
      }
      const { estimatedShipDate } = await confirmPrintfulOrder(order.printfulDraftOrderId);
      await fulfillOrder(session.id, email ?? undefined);
      if (email) {
        sendOrderConfirmed({ to: email, orderId: session.id, items: order.items, estimatedShipDate })
          .catch((err) => console.error("[email] Failed to send order confirmation:", err));
      }
    } catch (err) {
      console.error("Failed to confirm Printful order for session", session.id, err);
      // Return 500 so Stripe retries the webhook
      return NextResponse.json({ error: "Fulfillment failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
