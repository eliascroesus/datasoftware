"use client";

import { useState } from "react";
import { Layers, Lock, ArrowRight, AlertTriangle } from "lucide-react";
import { Footer } from "@/components/Footer";
import { cn } from "@/lib/utils";

export function LoginForm({ next }: { next: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.href = next || "/dashboard";
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Incorrect password.");
        setBusy(false);
      }
    } catch {
      setError("Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl2 bg-gradient-to-br from-brand to-accent-teal shadow-glow">
            <Layers className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Sign in to NamziLabs
          </h1>
          <p className="mt-1 text-sm text-muted">
            Your unified data-tracking dashboard
          </p>
        </div>

        <form onSubmit={submit} className="panel space-y-4 p-6">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-200">
              Password
            </span>
            <div className="relative">
              <Lock
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
              />
              <input
                type="password"
                autoFocus
                className="input pl-9"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </label>

          {error ? (
            <div className="flex items-center gap-2 rounded-lg border border-bad/20 bg-bad/10 p-2.5 text-sm text-bad">
              <AlertTriangle size={15} className="shrink-0" />
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy || !password}
            className={cn("btn-primary w-full")}
          >
            {busy ? "Signing in…" : "Sign in"}
            {!busy ? <ArrowRight size={16} /> : null}
          </button>
        </form>

        <Footer className="mt-8" />
      </div>
    </div>
  );
}
