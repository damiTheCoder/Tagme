import "server-only";
import { generateText } from "ai";
import { chatModel } from "@/lib/ai/model";
import { createAdminClient } from "@/lib/supabase/admin";
import { findConclusion } from "@/lib/chat/persist";

/**
 * Phase 3 of the bookend architecture: the AI's closing message.
 *
 * The customer has paid, so we wake the model ONCE to write a warm sign-off
 * with the real order details. This is one of only two places the model is
 * ever invoked for a transaction (the other is the intro).
 *
 * Triggered from BOTH sides by design:
 *   - primary: the Bachs webhook, the moment payment is marked paid
 *   - fallback: the customer's client, if the webhook never arrives
 *     (it can't reach localhost in dev)
 *
 * Those two can race, so idempotency matters: `findConclusion` is checked
 * before generating, a `complete_order_flow` marker part is stored with the
 * message so the check is cheap and durable, and the client fallback waits a
 * grace period before firing so the webhook usually wins. A double is
 * cosmetic rather than harmful, but in practice the guard holds.
 */

type Supa = ReturnType<typeof createAdminClient>;

type OrderForConclusion = {
  id: string;
  business_id: string;
  conversation_id: string | null;
  total: number;
  currency: string | null;
  payment_status: string | null;
  items: { name?: string; quantity?: number; unit_price?: number }[] | null;
};

export type ConclusionResult = {
  ok: boolean;
  /** False when a conclusion already existed (idempotent replay). */
  created: boolean;
  text?: string;
  /** Server message id — lets the client mark the row seen and skip the poll. */
  messageId?: string;
  error?: string;
};

export async function completeOrderFlow(orderId: string): Promise<ConclusionResult> {
  const supabase: Supa = createAdminClient();

  let order: OrderForConclusion | null = null;
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("id, business_id, conversation_id, total, currency, payment_status, items")
      .eq("id", orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    order = data as OrderForConclusion | null;
  } catch (e) {
    return { ok: false, created: false, error: e instanceof Error ? e.message : "load failed" };
  }

  if (!order?.conversation_id) {
    // Not a chat order (or no transcript to write to) — nothing to conclude.
    return { ok: false, created: false, error: "No conversation for order." };
  }

  // Never conclude ahead of payment: the closing message describes a
  // completed, paid order.
  if (order.payment_status !== "paid") {
    return { ok: false, created: false, error: "Order not paid yet." };
  }

  const conversationId = order.conversation_id;

  // Idempotency check #1 — the webhook and the client both call this.
  const existing = await findConclusion(supabase, conversationId, orderId);
  if (existing) {
    return {
      ok: true,
      created: false,
      text: existing.content.trim(),
      messageId: existing.id,
    };
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("name, currency")
    .eq("id", order.business_id)
    .maybeSingle();
  const businessName = business?.name ?? "the store";
  const currency = order.currency ?? business?.currency ?? "NGN";

  const lines = (order.items ?? [])
    .map((i) => {
      const qty = Number(i?.quantity ?? 1);
      const name = String(i?.name ?? "item");
      return `${qty} × ${name}`;
    })
    .filter((l) => !/undefined/.test(l));
  const summary = lines.length > 0 ? lines.join(", ") : "your order";
  const amount = Number(order.total).toFixed(2);

  try {
    let messageId: string | undefined;
    const { text } = await generateText({
      model: chatModel(),
      system: [
        `You are the friendly shop assistant for "${businessName}".`,
        `You are the CONCLUSION of a purchase the customer just completed.`,
        `Write ONE short, warm closing message — 2 sentences at most.`,
        `Confirm what they bought and the amount paid. Thank them briefly.`,
        `Do not ask questions, do not offer next steps, do not mention tools,`,
        `do not invent delivery dates, tracking numbers or discounts.`,
        `Reply in the customer's language. Plain text only — no markdown.`,
      ].join(" "),
      prompt: `The customer just paid for order ${order.id}: ${summary}. Total paid: ${amount} ${currency}.`,
    });

    const content = (text ?? "").trim().slice(0, 2000);
    if (!content) {
      return { ok: false, created: false, error: "Empty conclusion." };
    }

    // Idempotency check #2 — re-check right before writing, which shrinks
    // the race window between the webhook and the client fallback.
    const again = await findConclusion(supabase, conversationId, orderId);
    if (again) {
      return {
        ok: true,
        created: false,
        text: again.content.trim(),
        messageId: again.id,
      };
    }

    const { data: inserted, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        role: "assistant",
        content,
        // Marker part: makes the idempotency check above cheap, and lets the
        // client's history poll surface this message live (a streamed reply
        // never carries this toolName, so it can't be mistaken for one).
        parts: [{ toolName: "complete_order_flow", output: { order_id: orderId } }],
      })
      .select("id")
      .single();
    if (error) {
      // Pre-migration (no `parts`): still write the visible text.
      if (/parts/i.test(error.message)) {
        const retry = await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            role: "assistant",
            content,
          })
          .select("id")
          .single();
        if (retry.error) {
          return { ok: false, created: false, error: retry.error.message };
        }
        messageId = retry.data?.id ?? undefined;
      } else {
        return { ok: false, created: false, error: error.message };
      }
    } else {
      messageId = inserted?.id ?? undefined;
    }

    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    return { ok: true, created: true, text: content, messageId };
  } catch (e) {
    const message = e instanceof Error ? e.message : "conclusion failed";
    console.error("[chat conclusion] failed:", message);
    return { ok: false, created: false, error: message };
  }
}
