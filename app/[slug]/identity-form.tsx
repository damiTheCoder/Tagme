"use client";

import { useState } from "react";

export function IdentityForm({
  businessName,
  businessSlug,
  onDone,
}: {
  businessName: string;
  businessSlug: string;
  onDone: (token: string) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/chat/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: businessSlug, name, phone }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok || typeof data.token !== "string") {
        setError(data.error ?? "Something went wrong. Try again.");
        return;
      }
      onDone(data.token);
    } catch {
      setError("Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-8">
      <form onSubmit={onSubmit} className="w-full max-w-xs">
        <h2 className="text-center text-lg font-semibold">
          Welcome to {businessName}
        </h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Enter your details so we can get your order to you
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <input
            required
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="h-10 w-full rounded-md border-0 bg-gray-100 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none dark:bg-zinc-800"
          />
          <input
            required
            type="tel"
            placeholder="+234 801 234 5678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-10 w-full rounded-md border-0 bg-gray-100 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none dark:bg-zinc-800"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !name.trim() || !phone.trim()}
            className="h-10 w-full rounded-md bg-gradient-to-r from-[#0866FF] via-[#4C8DFF] to-[#00C6FF] text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            {submitting ? "Setting up…" : "Start chatting"}
          </button>
          <p className="text-center text-xs text-muted-foreground">
            We&apos;ll only use this to contact you about your order.
          </p>
        </div>
      </form>
    </div>
  );
}
