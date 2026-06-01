"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { AddressElement, Elements, useElements } from "@stripe/react-stripe-js";
import type {
  Appearance,
  StripeAddressElementChangeEvent,
} from "@stripe/stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

const LIGHT = {
  bg: "#fafaf9",
  fg: "#292524",
  muted: "#78716c",
  border: "#e7e5e4",
  focusBorder: "rgba(41,37,36,0.4)",
  danger: "#dc2626",
};
const DARK = {
  bg: "#1c1917",
  fg: "#fafaf9",
  muted: "#a8a29e",
  border: "#44403c",
  focusBorder: "rgba(250,250,249,0.4)",
  danger: "#f87171",
};

function makeAppearance(isDark: boolean): Appearance {
  void (isDark ? DARK : LIGHT);
  return { theme: isDark ? "night" : "flat" };
}

export interface SelectedShippingRate {
  id: string;
  name: string;
  rateCents: number;
  isFree: boolean;
}

export interface ShippingValue {
  name: string;
  address: {
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  shippingRate: SelectedShippingRate;
}

interface RateOption {
  id: string;
  name: string;
  rate: string;
  currency: string;
  minDeliveryDays: number | null;
  maxDeliveryDays: number | null;
  isFree: boolean;
}

function deliveryLabel(min: number | null, max: number | null): string {
  if (!min && !max) return "";
  if (min === max) return `${min} days`;
  return `${min ?? "?"}–${max ?? "?"} days`;
}

interface InnerProps {
  total: string | null;
  loading: boolean;
  error: string | null;
  items: { variantId: number; quantity: number }[];
  onSubmit: (value: ShippingValue) => void;
}

function AddressFormInner({
  total,
  loading,
  error,
  items,
  onSubmit,
}: InnerProps) {
  const elements = useElements();
  const [addressComplete, setAddressComplete] = useState(false);
  const [rates, setRates] = useState<RateOption[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const lastFetchKey = useRef<string>("");

  const fetchRates = useCallback(
    async (country: string, state: string, zip: string) => {
      const key = `${country}:${state}:${zip}`;
      if (key === lastFetchKey.current) return;
      lastFetchKey.current = key;

      setRatesLoading(true);
      setRatesError(null);
      setSelectedRateId(null);
      setRates([]);

      try {
        const res = await fetch("/api/shipping-rates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            countryCode: country,
            stateCode: state,
            zip,
            items,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          setRatesError(data.error ?? "Could not fetch shipping rates.");
          return;
        }

        const raw: RateOption[] = (data.rates ?? []).map(
          (r: Omit<RateOption, "isFree">) => ({ ...r, isFree: false }),
        );

        // Cheapest US rate ships free
        if (country === "US" && raw.length > 0) {
          const minIdx = raw.reduce(
            (mi, r, i, a) =>
              parseFloat(r.rate) < parseFloat(a[mi].rate) ? i : mi,
            0,
          );
          raw[minIdx] = { ...raw[minIdx], isFree: true };
        }

        setRates(raw);
        if (raw.length > 0) setSelectedRateId(raw[0].id);
      } catch {
        setRatesError("Could not fetch shipping rates.");
      } finally {
        setRatesLoading(false);
      }
    },
    [items],
  );

  function handleAddressChange(e: StripeAddressElementChangeEvent) {
    setAddressComplete(e.complete);
    if (!e.complete) return;
    const addr = e.value.address;
    fetchRates(addr.country, addr.state ?? "", addr.postal_code);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!elements || !addressComplete || !selectedRateId || ratesLoading)
      return;

    const el = elements.getElement(AddressElement);
    if (!el) return;
    const result = await el.getValue();
    if (!result.complete) return;

    const rate = rates.find((r) => r.id === selectedRateId);
    if (!rate) return;

    onSubmit({
      name: result.value.name,
      address: {
        line1: result.value.address.line1,
        line2: result.value.address.line2 ?? null,
        city: result.value.address.city,
        state: result.value.address.state ?? "",
        postal_code: result.value.address.postal_code,
        country: result.value.address.country,
      },
      shippingRate: {
        id: rate.id,
        name: rate.name,
        rateCents: rate.isFree ? 0 : Math.round(parseFloat(rate.rate) * 100),
        isFree: rate.isFree,
      },
    });
  }

  const selectedRate = rates.find((r) => r.id === selectedRateId) ?? null;
  const canSubmit =
    addressComplete && !!selectedRateId && !ratesLoading && rates.length > 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <AddressElement
        options={{
          mode: "shipping",
          autocomplete: {
            mode: "google_maps_api",
            apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
          },
        }}
        onChange={handleAddressChange}
      />

      {addressComplete && (
        <div>
          <p className="text-xs text-muted lowercase mb-3">shipping method</p>

          {ratesLoading && (
            <p className="text-sm text-muted lowercase">
              fetching shipping rates…
            </p>
          )}

          {!ratesLoading && ratesError && (
            <p className="text-sm text-red-600 dark:text-red-400 lowercase">
              {ratesError}
            </p>
          )}

          {!ratesLoading && rates.length > 0 && (
            <ul className="flex flex-col divide-y divide-border">
              {rates.map((rate) => {
                const delivery = deliveryLabel(
                  rate.minDeliveryDays,
                  rate.maxDeliveryDays,
                );
                const priceDisplay = rate.isFree
                  ? "Free"
                  : new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: rate.currency || "USD",
                    }).format(parseFloat(rate.rate));

                return (
                  <li key={rate.id}>
                    <label className="flex items-center gap-3 py-3 cursor-pointer">
                      <input
                        type="radio"
                        name="shippingRate"
                        value={rate.id}
                        checked={selectedRateId === rate.id}
                        onChange={() => setSelectedRateId(rate.id)}
                        className="accent-foreground shrink-0"
                      />
                      <span className="flex-1 text-sm text-foreground lowercase">
                        {rate.name}
                        {delivery && (
                          <span className="text-muted ml-1.5 text-xs">
                            ({delivery})
                          </span>
                        )}
                      </span>
                      <span className="text-sm font-medium text-foreground tabular-nums">
                        {priceDisplay}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 lowercase">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted lowercase">order total</p>
          <p className="text-lg font-medium text-foreground">{total}</p>
          {selectedRate && (
            <p className="text-xs text-muted lowercase mt-0.5">
              {selectedRate.isFree
                ? "+ free shipping"
                : `+ ${new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: selectedRate.currency || "USD",
                  }).format(parseFloat(selectedRate.rate))} shipping`}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || !canSubmit}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-foreground text-background text-sm font-medium lowercase hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-50"
        >
          {loading ? "preparing order…" : "continue to payment"}
        </button>
      </div>
    </form>
  );
}

interface Props extends InnerProps {
  onBack: () => void;
}

export function ShippingForm({ onBack, ...innerProps }: Props) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const options = useMemo(
    () => ({ appearance: makeAppearance(isDark) }),
    [isDark],
  );

  return (
    <div className="max-w-2xl">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-muted hover:text-foreground lowercase mb-6 inline-block transition-colors"
      >
        ← back to cart
      </button>
      <h1 className="text-xl font-medium text-foreground lowercase mb-6">
        shipping address
      </h1>
      <Elements stripe={stripePromise} options={options}>
        <AddressFormInner {...innerProps} />
      </Elements>
    </div>
  );
}
