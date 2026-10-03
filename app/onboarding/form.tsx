"use client";

import { useState } from "react";
import { createBusiness } from "./actions";
import { Button } from "@/components/ui/button";

const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "NGN",
  "KES",
  "ZAR",
  "INR",
  "BRL",
  "IDR",
  "PHP",
];

export function OnboardingForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    try {
      await createBusiness(formData);
    } catch (e) {
      // Next.js redirects throw; don't surface those as errors.
      if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <form action={onSubmit} className="mt-4 flex flex-col gap-3">
      <input
        name="name"
        required
        placeholder="Business name"
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <textarea
        name="description"
        placeholder="Short description (optional)"
        rows={3}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <select
        name="currency"
        defaultValue="USD"
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Creating…" : "Create business"}
      </Button>
    </form>
  );
}
