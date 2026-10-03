"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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

function cleanOptional(value: unknown, max: number, label: string): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new Error(`${label} must be a string.`);
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max)
    throw new Error(`${label} must be at most ${max} characters.`);
  return trimmed;
}

export async function updateBusinessSettings(input: {
  name: string;
  description?: string | null;
  hours?: string | null;
  policies?: string | null;
  notification_email?: string | null;
  currency?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const business = await getCurrentBusiness();
    if (!business) throw new Error("No business found.");

    if (typeof input.name !== "string" || !input.name.trim())
      throw new Error("Business name is required.");
    const name = input.name.trim();
    if (name.length > 200)
      throw new Error("Business name must be at most 200 characters.");

    const emailRaw =
      input.notification_email == null ? "" : String(input.notification_email).trim();
    if (emailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw))
      throw new Error("Notification email doesn't look valid.");
    const notification_email = emailRaw || null;

    const currency =
      input.currency == null || input.currency === ""
        ? business.currency
        : String(input.currency).trim();
    if (!CURRENCIES.includes(currency)) throw new Error("Invalid currency.");

    const supabase = await createClient();
    const { data: updated, error } = await supabase
      .from("businesses")
      .update({
        name,
        description: cleanOptional(input.description, 2000, "Description"),
        hours: cleanOptional(input.hours, 1000, "Hours"),
        policies: cleanOptional(input.policies, 2000, "Policies"),
        notification_email,
        currency,
      })
      .eq("id", business.id)
      .select("id");

    // NOTE: PostgREST returns NO error when 0 rows match, so the
    // .select("id") above is what makes a silent RLS block visible.
    if (error) throw new Error(error.message);
    if (!updated || updated.length === 0) {
      return { ok: false, error: "Business not found or not authorized" };
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save settings.",
    };
  }
}
