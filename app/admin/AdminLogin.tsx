"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/app/lib/firebase";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      const message =
        (err as { code?: string })?.code === "auth/invalid-credential"
          ? "Invalid email or password."
          : (err as Error).message;
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-xl font-medium lowercase text-foreground mb-2">
        admin sign in
      </h1>
      <p className="text-sm text-muted mb-6 lowercase">
        sign in with your admin account to manage images.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted lowercase">email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-foreground/20 lowercase"
            placeholder="you@example.com"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted lowercase">password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-foreground/20 lowercase"
          />
        </label>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 lowercase">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-md bg-foreground text-background font-medium lowercase hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          {loading ? "signing in…" : "sign in"}
        </button>
      </form>
    </div>
  );
}
