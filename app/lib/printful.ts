export interface PrintfulRecipient {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state_code?: string;
  country_code: string;
  zip: string;
  email?: string;
  phone?: string;
}

export interface PrintfulOrderItem {
  sync_variant_id: number;
  quantity: number;
}

function isTestMode() {
  return process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_");
}

function getApiKey() {
  const key = process.env.PRINTFUL_API_KEY;
  if (!key) throw new Error("PRINTFUL_API_KEY is not set");
  return key;
}

export async function createDraftPrintfulOrder(
  recipient: PrintfulRecipient,
  items: PrintfulOrderItem[],
): Promise<{ id: number; status: string }> {
  if (isTestMode()) {
    console.log(
      "[TEST MODE] Skipping real Printful draft. Would have sent:",
      JSON.stringify({ recipient, items }, null, 2),
    );
    return { id: 0, status: "draft" };
  }

  const res = await fetch("https://api.printful.com/orders", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ recipient, items }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Printful draft order failed (${res.status}): ${err?.error?.message ?? res.statusText}`,
    );
  }

  const data = await res.json();
  return { id: data.result.id, status: data.result.status };
}

export async function confirmPrintfulOrder(orderId: number): Promise<void> {
  if (isTestMode()) {
    console.log(
      "[TEST MODE] Skipping Printful order confirmation for draft:",
      orderId,
    );
    return;
  }

  const res = await fetch(
    `https://api.printful.com/orders/${orderId}/confirm`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Printful order confirmation failed (${res.status}): ${err?.error?.message ?? res.statusText}`,
    );
  }
}
