"use client";

/** Login is shown by layout when not authenticated; when authenticated layout redirects to /admin/dashboard. */
export default function AdminPage() {
  return (
    <p className="text-muted lowercase text-sm">
      Redirecting…
    </p>
  );
}
