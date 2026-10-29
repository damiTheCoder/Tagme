import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createBankTransferCharge,
  type BankTransferCharge,
} from "@/lib/bachs/client";

/**
 * Bank-transfer checkout for a chat order, extracted from
 * `POST /api/checkout/order` so the GUI-driven `pay_now` click can start the
 * exact same charge as the legacy PayNow button — one code path, one set of
 * reuse/safety rules.
 *
 * Amounts always come from our DB — never from the caller.
 */

type Supa = ReturnType<typeof createAdminClient>;

export type OrderRow = {
  id: string;
  business_id: string;
  conversation_id: string | null;
  total: number;
  currency: string | null;
  status: string | null;
  payment_status: string | null;
  paid_at: string | null;
  bachs_checkout_id: string | null;
  bachs_charge_id: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  bank_name: string | null;
  bank_transfer_expires_at: string | null;
};

const ORDER_COLUMNS =
  "id, business_id, conversation_id, total, currency, status, payment_status, paid_at, " +
  "bachs_checkout_id, bachs_charge_id, bank_account_number, bank_account_name, " +
  "bank_name, bank_transfer_expires_at";

// Older DBs (pre migration_13/14) lack the Bachs columns. Fall back so the
// route still works — it just can't reuse a previously-minted account.
const ORDER_COLUMNS_LEGACY = "id, business_id, conversation_id, total, currency, status";

export type PaymentPayload = {
  charge_id?: string;
  checkout_id?: string;
  account_number: string;
  account_name?: string | null;
  bank_name: string;
  expires_at?: string | null;
  amount: string;
  currency: string;
  reference?: string;
  payment_reference?: string;
};

export type StartPaymentResult =
  | { ok: true; reused: boolean; payment: PaymentPayload }
  | { ok: false; error: string; status: number };

export async function loadOrderRow(
  supabase: Supa,
  orderId: string
): Promise<OrderRow | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("id", orderId)
    .maybeSingle();
  if (!error) return data as OrderRow | null;

  // Migration 13/14 not applied yet — retry with the legacy column set.
  if (/column|schema/i.test(error.message)) {
    const legacy = await supabase
      .from("orders")
      .select(ORDER_COLUMNS_LEGACY)
      .eq("id", orderId)
      .maybeSingle();
    return legacy.data as OrderRow | null;
  }
  return null;
}

export async function loadBusiness(
  supabase: Supa,
  businessId: string
): Promise<{
  id: string;
  name: string;
  slug: string;
  bachs_account_id?: string | null;
} | null> {
  const { data, error } = await supabase
    .from("businesses")
    .select("id, name, slug, bachs_account_id")
    .eq("id", businessId)
    .maybeSingle();
  if (!error) return data;
  // Migration 15 not applied yet — no Connect account, so the charge is a
  // plain one (same as before) rather than a destination charge.
  if (/column|schema/i.test(error.message)) {
    const legacy = await supabase
      .from("businesses")
      .select("id, name, slug")
      .eq("id", businessId)
      .maybeSingle();
    return legacy.error ? null : legacy.data;
  }
  return null;
}

/** Persist the minted account details so repeat clicks reuse them. */
async function persistCharge(
  supabase: Supa,
  orderId: string,
  charge: BankTransferCharge
): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({
      bachs_checkout_id: charge.checkoutId,
      bachs_charge_id: charge.chargeId,
      bank_account_number: charge.accountNumber,
      bank_account_name: charge.accountName,
      bank_name: charge.bankName,
      bank_transfer_expires_at: charge.expiresAt || null,
    })
    .eq("id", orderId);
  if (error) {
    // Non-fatal: pre-migration DB. The charge still works; we just mint a
    // fresh account on the next click instead of reusing this one.
    console.warn("[checkout order] could not persist bank details:", error.message);
  }
}

function chargeToPayload(charge: BankTransferCharge): PaymentPayload {
  return {
    charge_id: charge.chargeId,
    checkout_id: charge.checkoutId,
    account_number: charge.accountNumber,
    account_name: charge.accountName,
    bank_name: charge.bankName,
    expires_at: charge.expiresAt,
    amount: charge.amount,
    currency: charge.currency,
    reference: charge.reference,
    payment_reference: charge.paymentReference,
  };
}

/**
 * Start (or resume) the bank transfer for an order.
 *
 * Reuses a still-valid minted account for repeat clicks, and refuses once the
 * order is already paid.
 */
export async function startOrderPayment(opts: {
  orderId: string;
  email?: string;
  businessName?: string;
  customerName?: string;
}): Promise<StartPaymentResult> {
  const supabase = createAdminClient();
  const order = await loadOrderRow(supabase, opts.orderId);
  if (!order) return { ok: false, error: "Order not found.", status: 404 };
  if (order.payment_status === "paid") {
    return { ok: false, error: "Order is already paid.", status: 400 };
  }
  const business = await loadBusiness(supabase, order.business_id);
  if (!business) return { ok: false, error: "Business not found.", status: 404 };

  // Repeat "Pay Now" click: reuse the still-valid account we already minted.
  if (
    order.bank_account_number &&
    order.bank_name &&
    (!order.bank_transfer_expires_at ||
      new Date(order.bank_transfer_expires_at).getTime() > Date.now())
  ) {
    return {
      ok: true,
      reused: true,
      payment: {
        charge_id: order.bachs_charge_id ?? undefined,
        checkout_id: order.bachs_checkout_id ?? undefined,
        account_number: order.bank_account_number,
        account_name: order.bank_account_name,
        bank_name: order.bank_name,
        expires_at: order.bank_transfer_expires_at,
        amount: Number(order.total).toFixed(2),
        currency: order.currency ?? "NGN",
      },
    };
  }

  // Bachs requires a deliverable email for custom (headless) checkouts.
  // Prefer the buyer's, else a tagged address on our own sending domain.
  const buyerEmail =
    typeof opts.email === "string" && opts.email.includes("@")
      ? opts.email
      : `checkout+${order.id.slice(0, 8)}@resend.dev`;

  try {
    const charge = await createBankTransferCharge({
      orderId: order.id,
      amount: String(order.total),
      email: buyerEmail,
      customerName: opts.customerName || undefined,
      businessName: opts.businessName || business.name,
      // With a Connect account on file this becomes a destination charge:
      // the vendor's share moves to them and we keep our 1.5% platform fee.
      vendorAccountId: business.bachs_account_id ?? null,
    });
    await persistCharge(supabase, order.id, charge);
    return { ok: true, reused: false, payment: chargeToPayload(charge) };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not start checkout.";
    console.error("[checkout order] failed", message, e instanceof Error ? e.stack : undefined);
    return { ok: false, error: message, status: 500 };
  }
}
