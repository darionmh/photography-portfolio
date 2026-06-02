import { NextRequest, NextResponse } from "next/server";
import { getOrderByPrintfulId } from "@/app/lib/orders";
import { sendOrderShipped } from "@/app/lib/email";

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  const expectedSecret = process.env.PRINTFUL_WEBHOOK_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = body as {
    type?: string;
    data?: {
      order?: { id?: number };
      shipment?: {
        carrier?: string;
        tracking_number?: string;
        tracking_url?: string;
      };
    };
  };

  if (event.type !== "package_shipped") {
    return NextResponse.json({ received: true });
  }

  const printfulOrderId = event.data?.order?.id;
  const shipment = event.data?.shipment;

  if (!printfulOrderId || !shipment?.tracking_number) {
    console.warn(
      "[printful webhook] Missing order ID or tracking number in package_shipped event",
    );
    return NextResponse.json({ received: true });
  }

  const order = await getOrderByPrintfulId(printfulOrderId);
  if (!order?.customerEmail) {
    console.warn(
      "[printful webhook] No customer email found for Printful order",
      printfulOrderId,
    );
    return NextResponse.json({ received: true });
  }

  sendOrderShipped({
    to: order.customerEmail,
    carrier: shipment.carrier ?? "Carrier",
    trackingNumber: shipment.tracking_number,
    trackingUrl:
      shipment.tracking_url ??
      `https://www.google.com/search?q=${encodeURIComponent(shipment.tracking_number)}`,
  }).catch((err) =>
    console.error("[email] Failed to send shipping notification:", err),
  );

  return NextResponse.json({ received: true });
}
