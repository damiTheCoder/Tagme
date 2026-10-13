import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * OPay payment webhook (stub for manual testing).
 * Real signature verification + field mapping land with the
 * payment integration. For now: insert a checkout transaction
 * and mark the order paid.
 *
 * Test manually:
 *   curl -X POST http://localhost:3000/api/webhooks/opay \
 *     -H 'Content-Type: application/json' \
 *     -d '{"business_id":"<uuid>","order_id":"<uuid>","amount":15000,"currency":"NGN","status":"success"}'
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const { business_id, order_id, amount, currency, status } = (body ?? {}) as {
    business_id?: unknown;
    order_id?: unknown;
    amount?: unknown;
    currency?: unknown;
    status?: unknown;
  };

  // TODO(opay): verify the OPay webhook signature header here before
  // trusting any field below.
  if (typeof business_id !== "string" || !business_id) {
    return NextResponse.json({ ok: false, error: "business_id is required." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const succeeded = status === "success" || status === "succeeded" || status === "paid";
  const numericAmount = Number(amount);

  const { error: txnError } = await supabase.from("transactions").insert({
    business_id,
    type: "income",
    amount: Number.isFinite(numericAmount) && numericAmount > 0 ? numericAmount : 0,
    currency: typeof currency === "string" && currency ? currency : "NGN",
    source: "checkout",
    category: "sales",
    reference: typeof order_id === "string" ? order_id : null,
    status: succeeded ? "settled" : "failed",
    settled_at: succeeded ? new Date().toISOString() : null,
  });
  if (txnError) {
    return NextResponse.json({ ok: false, error: txnError.message }, { status: 500 });
  }

  if (succeeded && typeof order_id === "string" && order_id) {
    await supabase
      .from("orders")
      .update({ status: "paid", updated_at: new Date().toISOString() })
      .eq("id", order_id)
      .eq("business_id", business_id);
  }

  revalidatePath("/dashboard/revenue");
  revalidatePath("/dashboard/credit-score");
  return NextResponse.json({ ok: true });
}
