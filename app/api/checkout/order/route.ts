import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getChargeStatus } from "@/lib/bachs/client";
import { loadOrderRow, startOrderPayment } from "@/lib/checkout/payment";

/**
 * Customer payment for an order via NGN bank transfer (anonymous buyers).
 * Amounts always come from our DB — never trust the client's number.
 *
 * Bank-transfer flow (no redirect):
 *   POST /api/checkout/order  { orderId, email?, businessName? }
 *     → 200 { ok: true, payment: { account_number, bank_name, expires_at, ... } }
 *
 * The charge itself lives in `startOrderPayment` so the GUI-driven chat flow
 * (`pay_now`) and this legacy route run one identical implementation.
 *
 * Bachs mints a reserved virtual account per charge and only returns the
 * details in the confirm response, so we persist them on the order row and
 * re-serve them for repeat "Pay Now" clicks until they expire.
 */

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

    const result = await startOrderPayment({
      orderId,
      email: typeof email === "string" ? email : undefined,
      businessName: typeof businessName === "string" ? businessName : undefined,
      customerName: typeof customerName === "string" ? customerName : undefined,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }
    if (result.reused) {
      return NextResponse.json({ ok: true, reused: true, payment: result.payment });
    }
    return NextResponse.json({ ok: true, payment: result.payment });
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
  const order = await loadOrderRow(supabase, orderId);
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
