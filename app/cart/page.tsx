"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/app/contexts/CartContext";

function formatPrice(retailPrice: string, currency: string, quantity: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(parseFloat(retailPrice) * quantity);
}

function cartTotal(
  items: { retailPrice: string; currency: string; quantity: number }[],
) {
  if (items.length === 0) return null;
  const total = items.reduce(
    (sum, i) => sum + parseFloat(i.retailPrice) * i.quantity,
    0,
  );
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: items[0].currency || "USD",
  }).format(total);
}

interface ShippingAddress {
  name: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  country: string;
  zip: string;
}

const emptyAddress: ShippingAddress = {
  name: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  country: "US",
  zip: "",
};

const inputClass =
  "w-full px-3 py-2 text-sm bg-background border border-border rounded focus:outline-none focus:border-foreground/40 text-foreground placeholder:text-muted lowercase transition-colors";
const labelClass = "block text-xs text-muted lowercase mb-1";

export default function CartPage() {
  const { items, hydrated, removeItem, updateQuantity, clearCart } = useCart();
  const [step, setStep] = useState<"cart" | "address">("cart");
  const [address, setAddress] = useState<ShippingAddress>(emptyAddress);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const total = cartTotal(items);

  function setField(field: keyof ShippingAddress, value: string) {
    setAddress((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCheckout(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setCheckoutError(null);
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            resourceId: item.resourceId,
            variantId: item.variantId,
            quantity: item.quantity,
            title: item.title,
            size: item.size,
            imageUrl: item.imageUrl ?? null,
          })),
          shippingAddress: {
            name: address.name,
            address1: address.address1,
            ...(address.address2 ? { address2: address.address2 } : {}),
            city: address.city,
            ...(address.state ? { state: address.state } : {}),
            country: address.country,
            zip: address.zip,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCheckoutError(data.error ?? "Checkout failed. Please try again.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setCheckoutError("Checkout failed. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  if (!hydrated) return null;

  if (items.length === 0) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-xl font-medium text-foreground lowercase mb-6">
          cart
        </h1>
        <p className="text-muted text-sm lowercase">your cart is empty.</p>
        <Link
          href="/"
          className="text-sm text-muted hover:text-foreground underline underline-offset-2 lowercase mt-4 inline-block transition-colors"
        >
          ← back to gallery
        </Link>
      </div>
    );
  }

  if (step === "address") {
    return (
      <div className="max-w-2xl">
        <button
          type="button"
          onClick={() => { setStep("cart"); setCheckoutError(null); }}
          className="text-sm text-muted hover:text-foreground lowercase mb-6 inline-block transition-colors"
        >
          ← back to cart
        </button>

        <h1 className="text-xl font-medium text-foreground lowercase mb-6">
          shipping address
        </h1>

        <form onSubmit={handleCheckout} className="flex flex-col gap-4">
          <div>
            <label htmlFor="name" className={labelClass}>full name</label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              value={address.name}
              onChange={(e) => setField("name", e.target.value)}
              className={inputClass}
              placeholder="Jane Smith"
            />
          </div>

          <div>
            <label htmlFor="address1" className={labelClass}>address</label>
            <input
              id="address1"
              type="text"
              autoComplete="address-line1"
              required
              value={address.address1}
              onChange={(e) => setField("address1", e.target.value)}
              className={inputClass}
              placeholder="123 Main St"
            />
          </div>

          <div>
            <label htmlFor="address2" className={labelClass}>
              apartment, suite, etc. <span className="opacity-50">(optional)</span>
            </label>
            <input
              id="address2"
              type="text"
              autoComplete="address-line2"
              value={address.address2}
              onChange={(e) => setField("address2", e.target.value)}
              className={inputClass}
              placeholder="Apt 4B"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="city" className={labelClass}>city</label>
              <input
                id="city"
                type="text"
                autoComplete="address-level2"
                required
                value={address.city}
                onChange={(e) => setField("city", e.target.value)}
                className={inputClass}
                placeholder="New York"
              />
            </div>
            <div>
              <label htmlFor="state" className={labelClass}>
                state / province <span className="opacity-50">(optional)</span>
              </label>
              <input
                id="state"
                type="text"
                autoComplete="address-level1"
                value={address.state}
                onChange={(e) => setField("state", e.target.value)}
                className={inputClass}
                placeholder="NY"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="zip" className={labelClass}>postal code</label>
              <input
                id="zip"
                type="text"
                autoComplete="postal-code"
                required
                value={address.zip}
                onChange={(e) => setField("zip", e.target.value)}
                className={inputClass}
                placeholder="10001"
              />
            </div>
            <div>
              <label htmlFor="country" className={labelClass}>country code</label>
              <input
                id="country"
                type="text"
                autoComplete="country"
                required
                maxLength={2}
                value={address.country}
                onChange={(e) => setField("country", e.target.value.toUpperCase())}
                className={inputClass}
                placeholder="US"
              />
            </div>
          </div>

          {checkoutError && (
            <p className="text-sm text-red-600 dark:text-red-400 lowercase">
              {checkoutError}
            </p>
          )}

          <div className="pt-2 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted lowercase">order total</p>
              <p className="text-lg font-medium text-foreground">{total}</p>
            </div>
            <button
              type="submit"
              disabled={checkoutLoading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-foreground text-background text-sm font-medium lowercase hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-50"
            >
              {checkoutLoading ? "preparing order…" : "continue to payment"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-xl font-medium text-foreground lowercase">cart</h1>
        <button
          type="button"
          onClick={clearCart}
          className="text-xs text-muted hover:text-foreground lowercase transition-colors cursor-pointer"
        >
          clear all
        </button>
      </div>

      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li
            key={`${item.productId}-${item.variantId}`}
            className="py-4 flex items-start gap-4"
          >
            <Link
              href={`/prints/${item.productId}`}
              className="shrink-0 w-12 h-12 bg-surface rounded overflow-hidden block"
              tabIndex={-1}
              aria-hidden
            >
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <Link
                href={`/prints/${item.productId}`}
                className="text-sm font-medium text-foreground lowercase hover:underline underline-offset-2 transition-colors"
              >
                {item.title}
              </Link>
              <p className="text-xs text-muted lowercase mt-0.5">{item.size}</p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    updateQuantity(item.productId, item.variantId, item.quantity - 1)
                  }
                  className="w-6 h-6 flex items-center justify-center rounded border border-border text-foreground hover:border-foreground/40 transition-colors text-sm cursor-pointer leading-none"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="w-5 text-center text-sm text-foreground tabular-nums">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateQuantity(item.productId, item.variantId, item.quantity + 1)
                  }
                  className="w-6 h-6 flex items-center justify-center rounded border border-border text-foreground hover:border-foreground/40 transition-colors text-sm cursor-pointer leading-none"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              <span className="text-sm text-foreground tabular-nums w-16 text-right">
                {formatPrice(item.retailPrice, item.currency, item.quantity)}
              </span>

              <button
                type="button"
                onClick={() => removeItem(item.productId, item.variantId)}
                className="text-muted hover:text-foreground transition-colors cursor-pointer"
                aria-label={`Remove ${item.title}`}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 pt-6 border-t border-border flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted lowercase">total</p>
          <p className="text-lg font-medium text-foreground">{total}</p>
          <p className="text-xs text-muted lowercase mt-0.5">free shipping</p>
        </div>
        <button
          type="button"
          onClick={() => setStep("address")}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-foreground text-background text-sm font-medium lowercase hover:opacity-80 transition-opacity cursor-pointer"
        >
          checkout
        </button>
      </div>

      <Link
        href="/"
        className="text-sm text-muted hover:text-foreground underline underline-offset-2 lowercase mt-6 inline-block transition-colors"
      >
        ← continue shopping
      </Link>
    </div>
  );
}
