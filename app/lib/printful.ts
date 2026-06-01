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

export interface PrintfulShippingRate {
  id: string;
  name: string;
  rate: string;
  currency: string;
  minDeliveryDays: number | null;
  maxDeliveryDays: number | null;
}

export function isTestMode() {
  return process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_");
}

function getApiKey() {
  const key = process.env.PRINTFUL_API_KEY;
  if (!key) throw new Error("PRINTFUL_API_KEY is not set");
  return key;
}

// In-process cache: sync_variant_id → catalog variant_id.
// Survives within a single Lambda invocation; avoids redundant Printful calls
// for carts with repeated variants or back-to-back requests in the same process.
const variantIdCache = new Map<number, number>();

async function resolveCatalogVariantId(
  syncVariantId: number,
  apiKey: string,
): Promise<number | null> {
  const cached = variantIdCache.get(syncVariantId);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(
      `https://api.printful.com/store/variants/${syncVariantId}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    if (!res.ok) {
      console.warn(
        `[printful] store/variants/${syncVariantId} returned ${res.status}`,
      );
      return null;
    }
    const data = await res.json();
    const catalogId: number | undefined = data?.result?.variant_id;
    if (catalogId) variantIdCache.set(syncVariantId, catalogId);
    return catalogId ?? null;
  } catch (err) {
    console.warn(`[printful] resolveCatalogVariantId(${syncVariantId}) failed:`, err);
    return null;
  }
}

export async function fetchShippingRates(
  countryCode: string,
  stateCode: string,
  zip: string,
  items: { syncVariantId: number; quantity: number }[],
): Promise<PrintfulShippingRate[]> {
  const apiKey = getApiKey();

  const resolvedItems = await Promise.all(
    items.map(async (i) => {
      const catalogId = await resolveCatalogVariantId(i.syncVariantId, apiKey);
      return catalogId
        ? { variant_id: catalogId, quantity: i.quantity }
        : { sync_variant_id: i.syncVariantId, quantity: i.quantity };
    }),
  );

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
      items: resolvedItems,
      currency: "USD",
      locale: "en_US",
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Printful shipping rates failed (${res.status}): ${err?.error?.message ?? res.statusText}`,
    );
  }

  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.result ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    rate: r.rate,
    currency: r.currency,
    minDeliveryDays: r.minDeliveryDays ?? null,
    maxDeliveryDays: r.maxDeliveryDays ?? null,
  }));
}

export async function updatePrintfulRecipientEmail(
  orderId: number,
  email: string,
): Promise<void> {
  if (isTestMode()) {
    console.log(`[TEST MODE] Skipping recipient email update for draft ${orderId}: ${email}`);
    return;
  }

  const res = await fetch(`https://api.printful.com/orders/${orderId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ recipient: { email } }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    // Log but don't throw — a missing email shouldn't block order confirmation
    console.error(
      `[printful] Failed to set recipient email on order ${orderId} (${res.status}): ${err?.error?.message ?? res.statusText}`,
    );
  }
}

export async function createDraftPrintfulOrder(
  recipient: PrintfulRecipient,
  items: PrintfulOrderItem[],
  shipping?: string,
): Promise<{ id: number; status: string }> {
  if (isTestMode()) {
    console.log(
      "[TEST MODE] Skipping real Printful draft. Would have sent:",
      JSON.stringify({ recipient, items, shipping }, null, 2),
    );
    return { id: 0, status: "draft" };
  }

  const res = await fetch("https://api.printful.com/orders", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ recipient, items, ...(shipping ? { shipping } : {}) }),
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
