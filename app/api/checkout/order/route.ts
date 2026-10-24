import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCustomerCheckout } from "@/lib/bachs/client";

function appUrl(req: Request): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    new URL(req.url).origin
  );
}

/**
 * Start a customer payment for an order. Public (anonymous buyers).
 * Amounts always come from our DB — never trust the client's number.
 */
export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }
  const { orderId, email, businessName } = (body ?? {}) as {
    orderId?: unknown;
    email?: unknown;
    businessName?: unknown;
  };
  if (typeof orderId !== "string" || !orderId) {
    return NextResponse.json({ ok: false, error: "orderId is required." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, business_id, total, currency, status, payment_status")
    .eq("id", orderId)
    .maybeSingle();
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

  try {
    const base = appUrl(req);
    const url = await createCustomerCheckout(
      order.id,
      String(order.total),
      typeof email === "string" && email.includes("@") ? email : "guest@placeholder.local",
      typeof businessName === "string" && businessName ? businessName : business.name,
      `${base}/b/${business.slug}/success?order=${order.id}`,
      `${base}/b/${business.slug}`
    );
    return NextResponse.json({ ok: true, url });
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
