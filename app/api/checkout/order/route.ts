import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createBankTransferCharge,
  getChargeStatus,
  type BankTransferCharge,
} from "@/lib/bachs/client";

/**
 * Customer payment for an order via NGN bank transfer (anonymous buyers).
 * Amounts always come from our DB — never trust the client's number.
 *
 * Bank-transfer flow (no redirect):
 *   POST /api/checkout/order  { orderId, email?, businessName? }
 *     → 200 { ok: true, payment: { account_number, bank_name, expires_at, ... } }
 *
 * Bachs mints a reserved virtual account per charge and only returns the
 * details in the confirm response, so we persist them on the order row and
 * re-serve them for repeat "Pay Now" clicks until they expire.
 */

type OrderRow = {
  id: string;
  business_id: string;
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
  "id, business_id, total, currency, status, payment_status, paid_at, " +
  "bachs_checkout_id, bachs_charge_id, bank_account_number, bank_account_name, " +
  "bank_name, bank_transfer_expires_at";

// Older DBs (pre migration_13/14) lack the Bachs columns. Fall back so the
// route still works — it just can't reuse a previously-minted account.
const ORDER_COLUMNS_LEGACY = "id, business_id, total, currency, status";

function paymentResponse(charge: {
  chargeId: string;
  checkoutId: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  expiresAt: string;
  amount: string;
  currency: string;
  reference: string;
  paymentReference: string;
}) {
  return {
    ok: true,
    payment: {
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
    },
  };
}

async function loadOrder(
  supabase: ReturnType<typeof createAdminClient>,
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

/** Persist the minted account details so repeat clicks reuse them. */
async function persistCharge(
  supabase: ReturnType<typeof createAdminClient>,
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

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }
    const { orderId, email, businessName, customerName } = (body ?? {}) as {
      orderId?: unknown;
      email?: unknown;
      businessName?: unknown;
      customerName?: unknown;
    };
    if (typeof orderId !== "string" || !orderId) {
      return NextResponse.json({ ok: false, error: "orderId is required." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const order = await loadOrder(supabase, orderId);
    if (!order) {
      return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
    }
    if (order.payment_status === "paid") {
      return NextResponse.json({ ok: false, error: "Order is already paid." }, { status: 400 });
    }
    const { data: business } = await supabase
      .from("businesses")
      .select("id, name, slug")
      .eq("id", order.business_id)
      .maybeSingle();
    if (!business) {
      return NextResponse.json({ ok: false, error: "Business not found." }, { status: 404 });
    }

    // Repeat "Pay Now" click: reuse the still-valid account we already minted.
    if (
      order.bank_account_number &&
      order.bank_name &&
      (!order.bank_transfer_expires_at ||
        new Date(order.bank_transfer_expires_at).getTime() > Date.now())
    ) {
      return NextResponse.json({
        ok: true,
        reused: true,
        payment: {
          charge_id: order.bachs_charge_id,
          checkout_id: order.bachs_checkout_id,
          account_number: order.bank_account_number,
          account_name: order.bank_account_name,
          bank_name: order.bank_name,
          expires_at: order.bank_transfer_expires_at,
          amount: Number(order.total).toFixed(2),
          currency: order.currency ?? "NGN",
        },
      });
    }

    // Bachs requires a deliverable email for custom (headless) checkouts.
    // Prefer the buyer's, else a tagged address on our own sending domain.
    const buyerEmail =
      typeof email === "string" && email.includes("@")
        ? email
        : `checkout+${order.id.slice(0, 8)}@resend.dev`;

    try {
      const charge = await createBankTransferCharge({
        orderId: order.id,
        amount: String(order.total),
        email: buyerEmail,
        customerName:
          typeof customerName === "string" && customerName ? customerName : undefined,
        businessName:
          typeof businessName === "string" && businessName ? businessName : business.name,
      });
      await persistCharge(supabase, order.id, charge);
      return NextResponse.json(paymentResponse(charge));
    } catch (e) {
      console.error(
        "[checkout order] failed",
        e instanceof Error ? e.message : e,
        e instanceof Error ? e.stack : undefined
      );
      return NextResponse.json(
        { ok: false, error: e instanceof Error ? e.message : "Could not start checkout." },
        { status: 500 }
      );
    }
  } catch (outer) {
    console.error(
      "[checkout order] failed",
      outer instanceof Error ? outer.message : outer,
      outer instanceof Error ? outer.stack : undefined
    );
    return NextResponse.json(
      { ok: false, error: outer instanceof Error ? outer.message : "Could not start checkout." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/checkout/order?orderId=… → live payment status.
 * Supplements the webhook (which needs a public URL) so the chat UI can
 * flip to "confirmed" without a reload.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId") ?? "";
  if (!orderId) {
    return NextResponse.json({ ok: false, error: "orderId is required." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const order = await loadOrder(supabase, orderId);
  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  }

  let paid = order.payment_status === "paid";

  // Webhooks can't reach localhost — reconcile directly with Bachs so the
  // buyer still sees instant confirmation in dev.
  if (!paid && order.bachs_charge_id) {
    const status = await getChargeStatus(order.bachs_charge_id);
    if (status === "succeeded") {
      await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", order.id);
      paid = true;
    }
  }

  return NextResponse.json({
    ok: true,
    paid,
    payment_status: order.payment_status ?? "unpaid",
  });
}
