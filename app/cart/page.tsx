"use client";

import Link from "next/link";
import { useCart } from "@/app/contexts/CartContext";

function formatPrice(retailPrice: string, currency: string, quantity: number) {
  const unit = parseFloat(retailPrice);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(unit * quantity);
}

function cartTotal(
  items: { retailPrice: string; currency: string; quantity: number }[],
) {
  if (items.length === 0) return null;
  const currency = items[0].currency || "USD";
  const total = items.reduce(
    (sum, i) => sum + parseFloat(i.retailPrice) * i.quantity,
    0,
  );
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(total);
}

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart } = useCart();

  const total = cartTotal(items);

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
                    updateQuantity(
                      item.productId,
                      item.variantId,
                      item.quantity - 1,
                    )
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
                    updateQuantity(
                      item.productId,
                      item.variantId,
                      item.quantity + 1,
                    )
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

      <div className="mt-6 pt-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted lowercase">total</p>
          <p className="text-lg font-medium text-foreground">{total}</p>
        </div>
        <form action="/api/checkout" method="POST">
          {items.map((item) => (
            <input
              key={`${item.productId}-${item.variantId}`}
              type="hidden"
              name="items"
              value={JSON.stringify({
                resourceId: item.resourceId,
                variantId: item.variantId,
                quantity: item.quantity,
              })}
            />
          ))}
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-foreground text-background text-sm font-medium lowercase hover:opacity-80 transition-opacity cursor-pointer"
          >
            checkout
          </button>
        </form>
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
