"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/app/lib/firebase";
import type { AnalyticsEvent, AnalyticsSummary } from "@/app/api/admin/analytics/route";

const EVENT_LABELS: Record<string, string> = {
  lightbox_opened: "Lightbox opened",
  lightbox_closed: "Lightbox closed",
  lightbox_navigate: "Lightbox navigate",
  gallery_selected: "Gallery selected",
  image_downloaded: "Image downloaded",
  image_shared: "Image shared",
  instagram_clicked: "Instagram clicked",
  buymeacoffee_clicked: "Buy me a coffee clicked",
};

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PropsCell({ props }: { props: Record<string, string | number | boolean | null> }) {
  const entries = Object.entries(props).filter(([, v]) => v != null && v !== "");
  if (entries.length === 0) return <span className="text-muted">—</span>;
  return (
    <span className="text-xs font-mono">
      {entries.map(([k, v]) => `${k}: ${v}`).join(", ")}
    </span>
  );
}

function MetaTooltip({ ev }: { ev: AnalyticsEvent }) {
  const [open, setOpen] = useState(false);
  const m = ev.meta;
  const lines = [
    m?.url && `url: ${m.url}`,
    m?.screen && `screen: ${m.screen}`,
    m?.viewport && `viewport: ${m.viewport}`,
    m?.language && `language: ${m.language}`,
    m?.timezone && `tz: ${m.timezone}`,
    m?.connection && `net: ${m.connection}`,
    ev.referrer && `referrer: ${ev.referrer}`,
    ev.ip && `ip: ${ev.ip}`,
    ev.userAgent && `ua: ${ev.userAgent}`,
  ].filter(Boolean) as string[];

  if (lines.length === 0) return <span className="text-muted">—</span>;

  return (
    <span className="relative">
      <button
        type="button"
        className="text-xs text-muted hover:text-foreground underline underline-offset-2 cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        {m?.viewport ?? "details"}
      </button>
      {open && (
        <span className="absolute left-0 top-5 z-10 bg-background border border-border rounded-md shadow-md p-3 text-xs font-mono whitespace-pre space-y-0.5 min-w-64 block">
          {lines.map((l) => (
            <span key={l} className="block break-all">{l}</span>
          ))}
          <button
            type="button"
            className="mt-2 block text-muted hover:text-foreground cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
          >
            close
          </button>
        </span>
      )}
    </span>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventFilter, setEventFilter] = useState("");
  const [envFilter, setEnvFilter] = useState<"" | "production" | "development">("production");

  const fetchData = useCallback(async (filter?: string) => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const params = new URLSearchParams({ limit: "100" });
      if (filter) params.set("event", filter);
      const res = await fetch(`/api/admin/analytics?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(eventFilter || undefined);
  }, [fetchData, eventFilter]);

  const visibleEvents = data?.recent.filter(
    (ev) => !envFilter || ev.env === envFilter
  ) ?? [];

  const sortedCounts = data
    ? Object.entries(data.counts).sort(([, a], [, b]) => b - a)
    : [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium lowercase">analytics</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-sm border border-border rounded-md overflow-hidden">
            {(["production", "", "development"] as const).map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setEnvFilter(val)}
                className={`px-3 py-1 lowercase cursor-pointer transition-colors ${envFilter === val ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}
              >
                {val === "" ? "all" : val === "production" ? "prod" : "dev"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => fetchData(eventFilter || undefined)}
            className="text-sm text-muted hover:text-foreground lowercase cursor-pointer"
          >
            refresh
          </button>
        </div>
      </div>

      {/* Summary counts */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted lowercase">event totals</h2>
        {loading && !data ? (
          <p className="text-sm text-muted lowercase">loading…</p>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              className={`border border-border rounded-md p-3 cursor-pointer transition-colors ${eventFilter === "" ? "bg-foreground text-background" : "hover:bg-muted/10"}`}
              onClick={() => setEventFilter("")}
            >
              <p className="text-2xl font-semibold tabular-nums">{data?.total ?? 0}</p>
              <p className="text-xs text-muted lowercase mt-1">all events</p>
            </div>
            {sortedCounts.map(([event, count]) => (
              <div
                key={event}
                className={`border border-border rounded-md p-3 cursor-pointer transition-colors ${eventFilter === event ? "bg-foreground text-background" : "hover:bg-muted/10"}`}
                onClick={() => setEventFilter(eventFilter === event ? "" : event)}
              >
                <p className="text-2xl font-semibold tabular-nums">{count}</p>
                <p className="text-xs text-muted lowercase mt-1">
                  {EVENT_LABELS[event] ?? event}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent events table */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted lowercase">
          recent events
          {eventFilter && (
            <span className="ml-2 text-foreground">
              — {EVENT_LABELS[eventFilter] ?? eventFilter}
              <button
                type="button"
                className="ml-2 text-muted hover:text-foreground cursor-pointer"
                onClick={() => setEventFilter("")}
              >
                ✕
              </button>
            </span>
          )}
        </h2>
        {loading ? (
          <p className="text-sm text-muted lowercase">loading…</p>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : !visibleEvents.length ? (
          <p className="text-sm text-muted lowercase">no events yet</p>
        ) : (
          <div className="overflow-x-auto border border-border rounded-md">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted text-xs uppercase">
                  <th className="text-left px-4 py-2 font-medium">time</th>
                  <th className="text-left px-4 py-2 font-medium">event</th>
                  <th className="text-left px-4 py-2 font-medium">properties</th>
                  <th className="text-left px-4 py-2 font-medium">client</th>
                  <th className="text-left px-4 py-2 font-medium">session</th>
                </tr>
              </thead>
              <tbody>
                {visibleEvents.map((ev) => (
                  <tr key={ev.id} className="border-b border-border last:border-0 hover:bg-muted/5">
                    <td className="px-4 py-2 text-muted whitespace-nowrap">
                      {formatDate(ev.timestamp)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap font-mono text-xs">
                      {ev.event}
                      {ev.env === "development" && (
                        <span className="ml-2 text-[10px] px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 font-sans">
                          dev
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <PropsCell props={ev.properties} />
                    </td>
                    <td className="px-4 py-2">
                      <MetaTooltip ev={ev} />
                    </td>
                    <td className="px-4 py-2 text-muted font-mono text-xs whitespace-nowrap">
                      {ev.sessionId ? ev.sessionId.slice(0, 8) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
