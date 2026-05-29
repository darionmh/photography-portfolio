import { NextRequest, NextResponse } from "next/server";

const PRINTFUL_API_BASE = "https://api.printful.com";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;

  if (!process.env.PRINTFUL_API_KEY) {
    return NextResponse.json({ error: "Printful API key not configured" }, { status: 500 });
  }

  const res = await fetch(`${PRINTFUL_API_BASE}/store/products/${productId}`, {
    headers: {
      Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
    },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: body?.error?.message ?? "Failed to fetch product" },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
