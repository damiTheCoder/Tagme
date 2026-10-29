import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyConversationToken } from "@/lib/chat/token";
import { createPendingOrder } from "@/lib/chat/order";
import { startOrderPayment } from "@/lib/checkout/payment";
import { completeOrderFlow } from "@/lib/chat/conclusion";
import {
  persistAssistantText,
  persistInteractive,
  persistUserLine,
} from "@/lib/chat/persist";
import {
  clampButtons,
  reply,
  type InteractiveButtons,
  type InteractiveList,
} from "@/lib/chat/interactive";

/**
 * GUI-driven shopping flow — Phase 2 of the bookend architecture.
 *
 * NO MODEL IS EVER WOKEN HERE. Every click is answered by a direct database
 * query and a rigid message, which is what keeps checkout hallucination-free
 * and cheap, and what makes the same payloads portable to WhatsApp buttons.
 *
 *   select_product_<ref>  → quantity buttons        (1, 2, Custom)
 *   qty_<n>               → creates the order      → Pay Now / Cancel
 *   pay_now               → Bachs bank transfer     → payment-card
 *   cancel                → cancels the order
 *   complete_flow         → Phase 3 fallback: wakes the AI for the sign-off
 *
 * Each response carries the message to render, so the client appends it
 * instantly — no "AI is thinking" delay.
 */

const MAX_ACTIONS_PER_HOUR = 120;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Session = {
  conversationId: string;
  customerId: string | null;
  businessId: string;
  businessName: string;
  currency: string;
  customer: { name: string | null; phone: string | null };
};

type Body = {
  businessSlug?: unknown;
  conversationToken?: unknown;
  action?: unknown;
  productId?: unknown;
  orderId?: unknown;
  quantity?: unknown;
};

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** Resolve a product reference (row UUID or PRD-001 public id) for a business. */
async function loadProduct(supabase: ReturnType<typeof createAdminClient>, businessId: string, ref: string) {
  const clean = ref.replace(/[,()"']/g, "").trim();
  if (!clean) return null;
  if (UUID_RE.test(clean)) {
    const { data } = await supabase
      .from("products")
      .select("id, public_id, name, price, image_url, in_stock, stock_count")
      .eq("business_id", businessId)
      .eq("id", clean)
      .maybeSingle();
    return data;
  }
  const { data } = await supabase
    .from("products")
    .select("id, public_id, name, price, image_url, in_stock, stock_count")
    .eq("business_id", businessId)
    .eq("public_id", clean.toUpperCase())
    .maybeSingle();
  return data;
}

/** Owns this order? Prevents a guessed id from touching someone else's. */
async function loadOwnedOrder(
  supabase: ReturnType<typeof createAdminClient>,
  conversationId: string,
  orderId: string
) {
  if (!UUID_RE.test(orderId ?? "")) return null;
  const { data } = await supabase
    .from("orders")
    .select("id, conversation_id, business_id, payment_status, status, total, currency, items")
    .eq("id", orderId)
    .maybeSingle();
  if (!data) return null;
  // conversation_id is nullable on very old rows; only accept a match.
  if (data.conversation_id !== conversationId) return null;
  return data;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("Invalid JSON body.");
  }

  const { businessSlug, conversationToken, action } = body;
  if (typeof businessSlug !== "string" || !businessSlug.trim()) return bad("businessSlug is required.");
  if (typeof conversationToken !== "string" || !conversationToken) return bad("conversationToken is required.");
  if (typeof action !== "string" || !action.trim()) return bad("action is required.");
  if (action.length > 80) return bad("Unknown action.");

  const conversationId = verifyConversationToken(conversationToken);
  if (!conversationId) return bad("Invalid or expired token.", 401);

  const supabase = createAdminClient();

  const { data: conv } = await supabase
    .from("conversations")
    .select(
      "id, business_id, customer_id, businesses!inner(id, name, slug, currency, suspended_at, deleted_at)"
    )
    .eq("id", conversationId)
    .maybeSingle();

  const biz = Array.isArray(conv?.businesses) ? conv?.businesses[0] : conv?.businesses;
  if (!conv || !biz || biz.slug !== businessSlug.trim()) return bad("Conversation not found.", 404);
  if (biz.suspended_at || biz.deleted_at) return bad("This business is temporarily unavailable.", 403);

  const customerId: string | null = conv.customer_id ?? null;
  let customer: { name: string | null; phone: string | null } = { name: null, phone: null };
  if (customerId) {
    const { data: c } = await supabase
      .from("customers")
      .select("name, phone")
      .eq("id", customerId)
      .maybeSingle();
    customer = { name: c?.name ?? null, phone: c?.phone ?? null };
  }

  const session: Session = {
    conversationId,
    customerId,
    businessId: biz.id,
    businessName: biz.name,
    currency: biz.currency ?? "NGN",
    customer,
  };

  // Clicks don't spend model tokens, but they DO write rows — cap abuse.
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .gte("created_at", hourAgo);
  if ((count ?? 0) >= MAX_ACTIONS_PER_HOUR) {
    return bad("You've been very active in the last hour. Please take a short break.", 429);
  }

  try {
    // ---------------------------------------------------------------- Phase 2
    if (action.startsWith("select_product_")) {
      const ref = action.slice("select_product_".length);
      const product = await loadProduct(supabase, session.businessId, ref);
      if (!product) return bad("That product is no longer available.", 404);
      if (product.in_stock === false) {
        return bad(`${product.name} is sold out right now. Please pick another.`);
      }

      const stock =
        product.stock_count == null ? null : Math.max(0, Number(product.stock_count));
      if (stock === 0) return bad(`${product.name} is sold out right now.`);

      await persistUserLine(supabase, conversationId, `Selected: ${product.name}`);

      // Rigid quantity options — no model inventing them. Hide "2" when only
      // one is left so the buttons can't offer an impossible quantity.
      const maxCustom = stock == null ? 100 : Math.min(100, stock);
      const buttons = clampButtons([
        { id: reply.qty(1), title: "1", style: "primary" },
        ...(stock == null || stock >= 2 ? [{ id: reply.qty(2), title: "2" }] : []),
        { id: reply.customQty(), title: "Custom" },
      ]);

      const message: InteractiveButtons = {
        type: "interactive-buttons",
        body: `How many ${product.name}${buttons.some((b) => b.title !== "1") ? "s" : ""}?`,
        buttons,
        meta: { product_id: product.id, product_name: product.name },
        custom_input: { min: 1, max: maxCustom, placeholder: "Quantity" },
      };
      await persistInteractive(supabase, conversationId, message);
      return NextResponse.json({ ok: true, message });
    }

    if (action.startsWith("qty_")) {
      const rawQty = action.slice("qty_".length);
      const quantity = Number(rawQty);
      const productId = typeof body.productId === "string" ? body.productId : "";
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
        return bad("Choose a quantity between 1 and 100.");
      }
      if (!session.customerId) return bad("Could not start conversation.", 500);

      const product = await loadProduct(supabase, session.businessId, productId);
      if (!product) return bad("That product is no longer available.", 404);

      const stock =
        product.stock_count == null ? null : Math.max(0, Number(product.stock_count));
      if (stock != null && quantity > stock) {
        return bad(`Only ${stock} left of ${product.name}.`);
      }

      await persistUserLine(supabase, conversationId, `${quantity} × ${product.name}`);

      const created = await createPendingOrder({
        business: { id: session.businessId, currency: session.currency },
        conversationId,
        customerId: session.customerId,
        customer: session.customer,
        items: [{ product_id: product.id, quantity }],
      });
      if (!created.ok) {
        // Expected refusal (monthly order limit) — surface it as copy.
        await persistAssistantText(
          supabase,
          conversationId,
          `${created.error} You can still keep browsing, or contact ${session.businessName} directly.`
        );
        return bad(created.error);
      }

      const total = Number(created.total).toFixed(2);
      const message: InteractiveButtons = {
        type: "interactive-buttons",
        body: `Order ready — ${quantity} × ${product.name} for ${session.currency} ${total}. Pay now?`,
        buttons: [
          { id: reply.payNow(), title: "Pay Now", style: "primary" },
          { id: reply.cancel(), title: "Cancel", style: "secondary" },
        ],
        meta: { order_id: created.order_id },
      };
      await persistInteractive(supabase, conversationId, message);
      return NextResponse.json({
        ok: true,
        message,
        order_id: created.order_id,
        total: created.total,
      });
    }

    if (action === "pay_now") {
      const orderId = typeof body.orderId === "string" ? body.orderId : "";
      const order = await loadOwnedOrder(supabase, conversationId, orderId);
      if (!order) return bad("Order not found.", 404);
      if (order.payment_status === "paid") return bad("Order is already paid.", 400);

      await persistUserLine(supabase, conversationId, "Pay now");

      const result = await startOrderPayment({
        orderId: order.id,
        businessName: session.businessName,
        customerName: customer.name ?? undefined,
      });
      if (!result.ok) return bad(result.error, result.status);

      const p = result.payment;
      const message = {
        type: "payment-card" as const,
        order_id: order.id,
        account_number: p.account_number,
        account_name: p.account_name ?? null,
        bank_name: p.bank_name,
        amount: p.amount,
        currency: p.currency,
        expires_at: p.expires_at ?? null,
        payment_reference: p.payment_reference ?? null,
        charge_id: p.charge_id ?? null,
        checkout_id: p.checkout_id ?? null,
      };
      await persistInteractive(supabase, conversationId, message);
      return NextResponse.json({ ok: true, message, order_id: order.id });
    }

    if (action === "cancel") {
      const orderId = typeof body.orderId === "string" ? body.orderId : "";
      const order = await loadOwnedOrder(supabase, conversationId, orderId);
      if (!order) return bad("Order not found.", 404);

      await persistUserLine(supabase, conversationId, "Cancel order");

      if (order.payment_status !== "paid") {
        await supabase
          .from("orders")
          .update({ status: "cancelled" })
          .eq("id", order.id)
          .neq("payment_status", "paid");
      }
      const text =
        order.payment_status === "paid"
          ? `That order has already been paid, so I've left it as is. If you need help, just say the word.`
          : `No problem — I've cancelled that order. Nothing was charged.`;
      await persistAssistantText(supabase, conversationId, text);
      return NextResponse.json({ ok: true, cancelled: true, text });
    }

    // ------------------------------------------------------------ Phase 3
    if (action === "complete_flow") {
      const orderId = typeof body.orderId === "string" ? body.orderId : "";
      const order = await loadOwnedOrder(supabase, conversationId, orderId);
      if (!order) return bad("Order not found.", 404);

      const result = await completeOrderFlow(orderId);
      return NextResponse.json({
        ok: result.ok,
        created: result.created,
        text: result.text ?? null,
        message_id: result.messageId ?? null,
        error: result.ok ? null : result.error,
      });
    }

    return bad("Unknown action.");
  } catch (e) {
    // One shape for every failure so the client can always show something.
    const message = e instanceof Error ? e.message : "Something went wrong.";
    console.error("[chat interact] failed:", message, {
      action,
      conversation_id: conversationId,
    });
    return bad(message, 500);
  }
}
