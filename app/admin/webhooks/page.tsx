"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/app/lib/firebase";

const PRINTFUL_EVENTS = [
  { id: "package_shipped", label: "package shipped" },
  { id: "package_returned", label: "package returned" },
  { id: "order_failed", label: "order failed" },
  { id: "order_canceled", label: "order canceled" },
];

interface WebhookStatus {
  printful: { url: string; types: string[] } | null;
  stripe: { configured: boolean; endpoint: string };
  printfulSecretConfigured: boolean;
  printfulApiKeyConfigured: boolean;
  siteUrl: string;
}

export default function WebhooksPage() {
  const [status, setStatus] = useState<WebhookStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["package_shipped"]);
  const [siteUrl, setSiteUrl] = useState("");

  const fetchStatus = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/webhooks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load");
      const data: WebhookStatus = await res.json();
      setStatus(data);
      if (data.siteUrl) setSiteUrl(data.siteUrl);
      if (data.printful?.types?.length) {
        setSelectedTypes(data.printful.types);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleRegister() {
    const user = auth.currentUser;
    if (!user) return;
    setSaving(true);
    setMessage(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/webhooks", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ types: selectedTypes, siteUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Registration failed");
      setMessage({ ok: true, text: "webhook registered" });
      fetchStatus();
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!confirm("Remove the Printful webhook?")) return;
    const user = auth.currentUser;
    if (!user) return;
    setRemoving(true);
    setMessage(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/webhooks", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Removal failed");
      setMessage({ ok: true, text: "webhook removed" });
      fetchStatus();
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setRemoving(false);
    }
  }

  function toggleType(id: string) {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  return (
    <div className="max-w-2xl space-y-12">
      <section>
        <h1 className="text-xl font-medium lowercase text-foreground mb-1">webhooks</h1>
        <p className="text-sm text-muted lowercase mb-8">
          manage incoming webhooks for order and shipping events
        </p>

        {loading && <p className="text-sm text-muted lowercase">loading…</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400 lowercase">{error}</p>}
      </section>

      {status && (
        <>
          {/* Printful */}
          <section className="space-y-5">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-medium lowercase text-foreground">printful</h2>
              {status.printful ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 lowercase">
                  registered
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-surface border border-border text-muted lowercase">
                  not registered
                </span>
              )}
            </div>

            {!status.printfulApiKeyConfigured && (
              <p className="text-sm text-amber-600 dark:text-amber-400 lowercase">
                PRINTFUL_API_KEY is not set — cannot manage webhooks
              </p>
            )}

            {status.printful && (
              <div className="rounded-md border border-border bg-surface p-4 space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted lowercase mb-1">endpoint</p>
                  <p className="font-mono text-xs break-all text-foreground">{status.printful.url}</p>
                </div>
                <div>
                  <p className="text-xs text-muted lowercase mb-1">events</p>
                  <div className="flex flex-wrap gap-2">
                    {status.printful.types.map((t) => (
                      <span
                        key={t}
                        className="text-xs px-2 py-0.5 rounded-full border border-border text-muted font-mono"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm text-muted lowercase">site url</label>
              <input
                type="url"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://yourdomain.com"
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm font-mono placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
              <p className="text-xs text-muted lowercase">must be an https:// address reachable by Printful</p>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-muted lowercase">events to subscribe</p>
              <div className="flex flex-col gap-2">
                {PRINTFUL_EVENTS.map(({ id, label }) => (
                  <label key={id} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(id)}
                      onChange={() => toggleType(id)}
                      className="rounded border-border text-foreground focus:ring-foreground/20 cursor-pointer"
                    />
                    <span className="text-sm text-foreground lowercase">{label}</span>
                    <span className="text-xs text-muted font-mono">{id}</span>
                  </label>
                ))}
              </div>
            </div>

            {!status.printfulSecretConfigured && (
              <p className="text-xs text-amber-600 dark:text-amber-400 lowercase">
                PRINTFUL_WEBHOOK_SECRET is not set — the registered URL will have no secret. Set it to enable signature verification.
              </p>
            )}

            <div className="flex gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleRegister}
                disabled={saving || !status.printfulApiKeyConfigured || selectedTypes.length === 0}
                className="px-5 py-2 rounded-md bg-foreground text-background text-sm font-medium lowercase hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {saving
                  ? "registering…"
                  : status.printful
                    ? "update webhook"
                    : "register webhook"}
              </button>
              {status.printful && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={removing}
                  className="px-5 py-2 rounded-md border border-border text-sm text-muted lowercase hover:text-foreground hover:border-foreground disabled:opacity-50 cursor-pointer"
                >
                  {removing ? "removing…" : "remove webhook"}
                </button>
              )}
            </div>

            {message && (
              <p
                className={`text-sm lowercase ${message.ok ? "text-foreground" : "text-red-600 dark:text-red-400"}`}
              >
                {message.text}
              </p>
            )}
          </section>

          <hr className="border-border" />

          {/* Stripe */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-medium lowercase text-foreground">stripe</h2>
              {status.stripe.configured ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 lowercase">
                  secret configured
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 lowercase">
                  STRIPE_WEBHOOK_SECRET not set
                </span>
              )}
            </div>

            <p className="text-sm text-muted lowercase">
              Stripe webhooks are managed in the{" "}
              <a
                href="https://dashboard.stripe.com/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                Stripe dashboard
              </a>
              . Register the endpoint below and paste the signing secret into your env as{" "}
              <span className="font-mono text-xs">STRIPE_WEBHOOK_SECRET</span>.
            </p>

            <div className="rounded-md border border-border bg-surface p-4 space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted lowercase mb-1">endpoint</p>
                <p className="font-mono text-xs break-all text-foreground">{status.stripe.endpoint}</p>
              </div>
              <div>
                <p className="text-xs text-muted lowercase mb-1">events to subscribe</p>
                <span className="text-xs px-2 py-0.5 rounded-full border border-border text-muted font-mono">
                  checkout.session.completed
                </span>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
