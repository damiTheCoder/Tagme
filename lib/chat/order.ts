import "server-only";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderNotification } from "@/lib/email/notify";

/**
 * Pending-order creation, extracted from the AI tool so the GUI-driven
 * shopping flow (`POST /api/chat/interact`) and the model can share ONE
 * implementation. The stock gate, free-tier quota, public-ID resolution and
 * owner notification must behave identically no matter who created the order.
 *
 * Throws on genuine failures; returns `{ ok: false, error }` for the one
 * expected refusal (merchant over their monthly order limit).
 */

type Supa = ReturnType<typeof createAdminClient>;

export type OrderItemInput = { product_id: string; quantity: number };

export type CreateOrderResult =
  | { ok: false; error: string }
  | { ok: true; order_id: string; total: number; currency: string };

// Fail loudly instead of hanging: every DB round-trip races an 8s timeout so
// pool stalls surface in logs instead of silence.
const withTimeout = <T>(label: string, work: PromiseLike<T>): Promise<T> => {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`DB query timeout after 8s (${label})`)),
      8000
    );
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
};

type ProductRow = {
  id: string;
  public_id: string | null;
  name: string;
  price: number;
  stock_count: number | null;
};

export async function createPendingOrder(opts: {
  business: { id: string; currency: string };
  conversationId: string;
  customerId: string;
  customer: { name: string | null; phone: string | null };
  items: OrderItemInput[];
  customerName?: string | null;
  customerPhone?: string | null;
}): Promise<CreateOrderResult> {
  const { business, conversationId, customerId, customer, items } = opts;
  const supabase: Supa = createAdminClient();

  console.log("[create_order] START", {
    business_id: business.id,
    customer_id: customerId,
    conversation_id: conversationId,
    items_count: items?.length,
  });

  try {
    console.log("[create_order] entering validation", {
      items: JSON.stringify(items).slice(0, 500),
    });

    // Free-tier gate: free plans get 10 orders per rolling 30 days.
    // Missing columns (pre-migration_13) fail open — sales must flow.
    let monthlyCount = 0;
    try {
      const { data: gate, error: gateError } = await supabase
        .from("businesses")
        .select("subscription_status, orders_this_month, orders_month_reset_at")
        .eq("id", business.id)
        .maybeSingle();
      if (gateError) throw gateError;
      const resetAt = gate?.orders_month_reset_at
        ? new Date(gate.orders_month_reset_at).getTime()
        : 0;
      if (Date.now() - resetAt > 30 * 24 * 3600 * 1000) {
        monthlyCount = 0;
        await supabase
          .from("businesses")
          .update({
            orders_this_month: 0,
            orders_month_reset_at: new Date().toISOString(),
          })
          .eq("id", business.id);
      } else {
        monthlyCount = Number(gate?.orders_this_month) || 0;
      }
      if (gate?.subscription_status !== "active" && monthlyCount >= 10) {
        return {
          ok: false,
          error:
            "This merchant has reached their monthly order limit. Please try again next month or contact them directly.",
        };
      }
    } catch (e) {
      // Pre-migration columns missing — fail open, keep selling.
      if (e instanceof Error && /monthly order limit/.test(e.message)) throw e;
      console.log("[create_order] gate skipped", {
        reason: e instanceof Error ? e.message : "unknown",
      });
      monthlyCount = 0;
    }

    const keys = [
      ...new Set(
        items.map((i) =>
          String(i.product_id ?? "")
            .replace(/[,()"']/g, "")
            .trim()
        )
      ),
    ].filter(Boolean);
    if (keys.length === 0) throw new Error("No valid product references.");

    console.log("[create_order] looking up products", { item_keys: keys });

    // Accept row UUIDs and public IDs (PRD-001…) — either may arrive here.
    // They MUST be queried separately: a single .or() mixing id.in.(PRD-001)
    // makes Postgres cast the public ID to uuid and abort the whole query
    // with 22P02, so the public_id branch never matches. Query each kind on
    // its own column instead.
    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const uuidKeys = keys.filter((k) => UUID_RE.test(k));
    const publicKeys = keys.filter((k) => !UUID_RE.test(k));

    const resolved: ProductRow[] = [];
    if (uuidKeys.length > 0) {
      const { data, error } = await withTimeout(
        "product lookup (by id)",
        supabase
          .from("products")
          .select("id, public_id, name, price, stock_count")
          .eq("business_id", business.id)
          .in("id", uuidKeys)
      );
      if (error) throw new Error(error.message);
      resolved.push(...(data ?? []));
    }
    if (publicKeys.length > 0) {
      const { data, error } = await withTimeout(
        "product lookup (by public_id)",
        supabase
          .from("products")
          .select("id, public_id, name, price, stock_count")
          .eq("business_id", business.id)
          .in(
            "public_id",
            publicKeys.map((k) => k.toUpperCase())
          )
      );
      if (error) throw new Error(error.message);
      resolved.push(...(data ?? []));
    }

    console.log("[create_order] products resolved", {
      count: resolved.length,
      uuid_keys: uuidKeys.length,
      public_keys: publicKeys.length,
    });

    const products = resolved;
    const byKey = new Map<string, ProductRow>();
    for (const p of products) {
      byKey.set(p.id, p);
      if (p.public_id) byKey.set(p.public_id.toUpperCase(), p);
    }
    for (const key of keys) {
      if (!byKey.has(key) && !byKey.has(key.toUpperCase())) {
        console.log("[create_order] product not found", { product_ref: key });
        throw new Error("A product was not found.");
      }
    }

    // Stock gate: reject before creating anything when the total ordered
    // quantity exceeds available stock. stock_count null = untracked legacy
    // row (pre-migration): skip the check for those.
    const resolveRow = (key: string) =>
      byKey.get(key) ?? byKey.get(key.toUpperCase());
    const qtyByRowId = new Map<string, number>();
    for (const i of items) {
      const row = resolveRow(String(i.product_id ?? ""));
      if (!row) {
        console.log("[create_order] product not found", {
          product_ref: i.product_id,
        });
        throw new Error("A product was not found.");
      }
      qtyByRowId.set(row.id, (qtyByRowId.get(row.id) ?? 0) + i.quantity);
    }
    const stockById = new Map<string, number | null>();
    for (const [rowId, qty] of qtyByRowId) {
      const p = byKey.get(rowId)!;
      const stock = p.stock_count as number | null;
      if (stock != null && stock < qty) {
        console.log("[create_order] insufficient stock", {
          product_name: p.name,
          stock_count: stock,
          requested: qty,
        });
        throw new Error(
          `Insufficient stock for ${p.name}. Only ${stock} available.`
        );
      }
      stockById.set(rowId, stock == null ? null : Math.max(0, stock - qty));
    }

    const orderItems = items.map((i) => {
      const p = resolveRow(String(i.product_id ?? ""))!;
      const unitPrice = Number(p.price);
      return {
        product_id: p.id,
        name: p.name,
        quantity: i.quantity,
        unit_price: unitPrice,
      };
    });
    const total =
      Math.round(
        orderItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0) * 100
      ) / 100;

    console.log("[create_order] inserting", {
      total,
      currency: business.currency,
      status: "pending",
      customer_id_resolved: customerId,
    });
    const { data: order, error: orderError } = await withTimeout(
      "order insert",
      supabase
        .from("orders")
        .insert({
          business_id: business.id,
          customer_id: customerId,
          conversation_id: conversationId,
          items: orderItems,
          total,
          currency: business.currency,
          status: "pending",
        })
        .select("id")
        .single()
    );
    if (orderError) throw new Error(orderError.message);
    console.log("[create_order] SUCCESS", { order_id: order.id });

    // Count toward the free-tier quota. Best-effort: missing columns must
    // never fail the order.
    try {
      await supabase
        .from("businesses")
        .update({ orders_this_month: monthlyCount + 1 })
        .eq("id", business.id);
    } catch {
      // ignore — quota tracking is non-critical
    }

    // Decrement stock now that the order exists. Validated above so this
    // cannot go negative; capped defensively. Skips untracked (null) rows.
    for (const [productId, next] of stockById) {
      if (next == null) continue;
      const { error: stockError } = await withTimeout(
        "stock decrement",
        supabase
          .from("products")
          .update({ stock_count: next, in_stock: next > 0 })
          .eq("id", productId)
          .eq("business_id", business.id)
      );
      if (stockError) throw new Error(stockError.message);
    }

    const patch: { name?: string; phone?: string } = {};
    // Never overwrite known details — only fill in blanks.
    if (!customer.name && opts.customerName?.trim())
      patch.name = opts.customerName.trim().slice(0, 200);
    if (!customer.phone && opts.customerPhone?.trim())
      patch.phone = opts.customerPhone.trim().slice(0, 50);
    if (Object.keys(patch).length > 0) {
      await withTimeout(
        "customer patch",
        supabase.from("customers").update(patch).eq("id", customerId)
      );
    }

    // Fire-and-forget owner email — never blocks the response.
    // sendOrderNotification swallows its own errors; the trailing .catch
    // covers any unexpected rejection at the boundary.
    sendOrderNotification({
      businessId: business.id,
      orderId: order.id,
      items: orderItems.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
      total,
      currency: business.currency,
      customerName: customer.name ?? opts.customerName?.trim() ?? null,
      customerPhone: customer.phone ?? opts.customerPhone?.trim() ?? null,
    }).catch(() => {});

    try {
      revalidatePath("/dashboard/credit-score");
    } catch {
      // Revalidation is best-effort here; the order already exists.
    }

    return { ok: true, order_id: order.id, total, currency: business.currency };
  } catch (err) {
    const e = err as Error & { code?: string; details?: unknown; hint?: string };
    console.error("[create_order] FAILED", {
      message: e.message,
      code: e.code,
      details: e.details,
      hint: e.hint,
      business_id: business.id,
      customer_id: customerId,
      conversation_id: conversationId,
      items_input: JSON.stringify(items).slice(0, 500),
    });
    throw err;
  }
}
