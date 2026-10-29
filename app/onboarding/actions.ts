"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateSlug } from "@/lib/slug";
import { ensureUniqueSlug } from "@/lib/business";
import {
  createVendorAccount,
  createVendorAccountLink,
  submitVendorPayoutDestination,
} from "@/lib/bachs/client";

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

export async function createBusiness(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const currency = String(formData.get("currency") ?? "USD").trim();

  if (!name) throw new Error("Business name is required.");
  if (!CURRENCIES.includes(currency)) throw new Error("Invalid currency.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();
  if (existing) redirect("/dashboard");

  const base = generateSlug(name) || "business";
  const slug = await ensureUniqueSlug(base);

  const { error } = await supabase.from("businesses").insert({
    owner_id: user.id,
    name,
    slug,
    description: description || null,
    currency,
  });
  if (error) throw new Error(error.message);

  // New vendors still owe us payout details — send them to the Connect step
  // instead of the dashboard. Existing businesses never reach this line.
  redirect("/onboarding/payouts");
}

type VendorRow = {
  id: string;
  name: string;
  notification_email?: string | null;
  bank_account_number?: string | null;
  bank_code?: string | null;
  bank_name?: string | null;
  bachs_account_id?: string | null;
};

/** Surface the "migration not applied yet" case instead of a raw PG error. */
function dbError(message: string): Error {
  if (/column|schema/i.test(message)) {
    return new Error(
      "Your database is missing the payout columns. Run supabase/migration_15_vendor_connect.sql in the Supabase SQL editor, then try again."
    );
  }
  return new Error(message);
}

async function appBaseUrl(): Promise<string> {
  // Prefer what the request actually came in on (works behind proxies and on
  // preview deployments); fall back to the canonical app URL.
  try {
    const h = await headers();
    const proto = h.get("x-forwarded-proto") ?? "http";
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    if (host) return `${proto}://${host}`;
  } catch {
    // headers() unavailable — fall through to the configured URL.
  }
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

async function loadVendor(supabase: Awaited<ReturnType<typeof createClient>>, ownerId: string) {
  const FULL =
    "id, name, notification_email, bank_account_number, bank_code, bank_name, bachs_account_id";
  const { data, error } = await supabase
    .from("businesses")
    .select(FULL)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!error) return data as VendorRow | null;

  // Migration 15 not applied yet — fall back to the columns that always exist
  // so the caller gets a readable error rather than a crash.
  if (/column|schema/i.test(error.message)) {
    const legacy = await supabase
      .from("businesses")
      .select("id, name, notification_email")
      .eq("owner_id", ownerId)
      .limit(1)
      .maybeSingle();
    if (legacy.error) throw dbError(legacy.error.message);
    return legacy.data as VendorRow | null;
  }
  throw dbError(error.message);
}

/**
 * Step 2 of onboarding: take the vendor's payout bank details, give them a
 * Bachs Connect account, and send them to hosted identity verification.
 *
 * Flow (spec):
 *   1. Validate + save bank_account_number / bank_code / bank_name.
 *   2. POST /v1/accounts with the `recipient` persona and `payouts` capability
 *      (once per vendor), then store the returned account id.
 *   3. Submit the bank details as the account's payout destination.
 *   4. POST /v1/accounts/{id}/account-links and redirect to its URL.
 *
 * Called with no submitted bank fields (empty FormData) it re-runs 2-4 from
 * what we already stored — that is how the return/refresh screens re-mint a
 * link, since account links are single-use and supersede the previous one.
 */
export async function createVendorBachsAccount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const business = await loadVendor(supabase, user.id);
  if (!business) redirect("/onboarding");

  const clean = (v: FormDataEntryValue | null) =>
    typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";

  const bankAccountNumber = clean(formData.get("bank_account_number")).replace(/\D/g, "");
  const bankCode = clean(formData.get("bank_code"));
  const bankName = clean(formData.get("bank_name"));

  // Submitted values win; otherwise reuse what we stored (link re-mint).
  const accountNumber = bankAccountNumber || (business.bank_account_number ?? "").trim();
  const code = bankCode || (business.bank_code ?? "").trim();
  const name = bankName || (business.bank_name ?? "").trim();

  if (accountNumber.replace(/\D/g, "").length < 6) {
    throw new Error("Enter a valid bank account number.");
  }
  if (!code) throw new Error("Bank code is required.");
  if (!name) throw new Error("Bank name is required.");

  const contactEmail = user.email ?? business.notification_email ?? null;
  if (!contactEmail) {
    throw new Error("We need an email address for the vendor account — set it in your profile first.");
  }

  // 1. Save the details first, so a failed Bachs call never loses them.
  const { error: saveError } = await supabase
    .from("businesses")
    .update({
      bank_account_number: accountNumber,
      bank_code: code,
      bank_name: name,
    })
    .eq("id", business.id);
  if (saveError) throw dbError(saveError.message);

  // 2. The Connect account itself, created exactly once per vendor.
  let accountId = business.bachs_account_id ?? null;
  if (!accountId) {
    const created = await createVendorAccount({
      contactEmail,
      displayName: business.name,
    });
    accountId = created.accountId;

    const { error: idError } = await supabase
      .from("businesses")
      .update({ bachs_account_id: accountId })
      .eq("id", business.id);
    if (idError) throw dbError(idError.message);
  }

  // 3. Bank details as the account's payout destination. Non-fatal: an
  // unresolved account holder name (or a rejected bank code) leaves the
  // requirement outstanding, and the hosted flow collects it — so never
  // block the redirect on it.
  try {
    const { outstanding } = await submitVendorPayoutDestination({
      accountId,
      accountNumber,
      bankCode: code,
      bankName: name,
    });
    if (outstanding.length) {
      console.log("[onboarding] payout destination still outstanding:", outstanding);
    }
  } catch (err) {
    console.error(
      "[onboarding] could not submit payout destination:",
      err instanceof Error ? err.message : err
    );
  }

  // 4. Hand the vendor to hosted verification.
  const base = await appBaseUrl();
  const url = await createVendorAccountLink({
    accountId,
    refreshUrl: `${base}/onboarding/payouts`,
    returnUrl: `${base}/onboarding/payouts/return`,
  });
  redirect(url);
}
