import { tool } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderNotification } from "@/lib/email/notify";

export type ChatBusiness = {
  id: string;
  name: string;
  description: string | null;
  hours: string | null;
  policies: string | null;
  currency: string;
};

/**
 * Tools for the public chat agent. All use the admin client (bypasses RLS)
 * since this is unauthenticated public traffic scoped to one business.
 */
export function createTools(opts: {
  business: ChatBusiness;
  conversationId: string;
  customerId: string;
  customer: { name: string | null; phone: string | null };
}) {
  const { business, conversationId, customerId, customer } = opts;
  const admin = () => createAdminClient();

  return {
    get_business_info: tool({
      description:
        "Get the business profile: name, description, hours, policies, currency.",
      inputSchema: z.object({}),
      execute: async () => ({
        name: business.name,
        description: business.description,
        hours: business.hours,
        policies: business.policies,
        currency: business.currency,
      }),
    }),

    search_products: tool({
      description:
        "Search the product catalog by name. Always use this before quoting a price.",
      inputSchema: z.object({
        query: z.string().describe("Product name or keyword to search for"),
      }),
      execute: async ({ query }) => {
        const clean = query.replace(/[%_]/g, "").trim().slice(0, 100);
        const { data, error } = await admin()
          .from("products")
          .select("id, name, price, in_stock, stock_count, description, details")
          .eq("business_id", business.id)
          .ilike("name", `%${clean}%`)
          .limit(10);
        if (error) throw new Error(error.message);
        return (data ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          in_stock: p.in_stock,
          stock_count: p.stock_count,
          description: p.description,
          details: p.details,
        }));
      },
    }),

    create_order: tool({
      description:
        "Create a pending order for the customer. Confirm items and total with the customer first. The owner approves it later.",
      inputSchema: z.object({
        items: z
          .array(
            z.object({
              product_id: z.string(),
              quantity: z.number().int().min(1).max(100),
            })
          )
          .min(1),
        customer_name: z.string().optional(),
        customer_phone: z.string().optional(),
      }),
      execute: async ({ items, customer_name, customer_phone }) => {
        console.log("[create_order] START", {
          business_id: business.id,
          customer_id: customerId,
          conversation_id: conversationId,
          items_count: items?.length,
        });
        try {
          const supabase = admin();
          const ids = [...new Set(items.map((i) => i.product_id))];
          const { data: products, error: lookupError } = await supabase
            .from("products")
            .select("id, name, price, stock_count")
            .eq("business_id", business.id)
            .in("id", ids);
          if (lookupError) throw new Error(lookupError.message);
          const byId = new Map((products ?? []).map((p) => [p.id, p]));
          for (const id of ids) {
            if (!byId.has(id)) {
              console.log("[create_order] product not found", { product_id: id });
              throw new Error("A product was not found.");
            }
          }

        // Stock gate: reject before creating anything when the total
        // ordered quantity exceeds available stock. stock_count null =
        // untracked legacy row (pre-migration): skip the check for those.
        const qtyById = new Map<string, number>();
        for (const i of items) {
          qtyById.set(i.product_id, (qtyById.get(i.product_id) ?? 0) + i.quantity);
        }
        const stockById = new Map<string, number | null>();
        for (const [productId, qty] of qtyById) {
          const p = byId.get(productId)!;
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
          stockById.set(productId, stock == null ? null : Math.max(0, stock - qty));
        }

        const orderItems = items.map((i) => {
          const p = byId.get(i.product_id)!;
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
            orderItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0) *
              100
          ) / 100;

        console.log("[create_order] inserting", {
          total,
          currency: business.currency,
          status: "pending",
          customer_id_resolved: customerId,
        });
        const { data: order, error: orderError } = await supabase
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
          .single();
        if (orderError) throw new Error(orderError.message);
        console.log("[create_order] SUCCESS", { order_id: order.id });

        // Decrement stock now that the order exists. Validated above so
        // this cannot go negative; capped defensively. Skips untracked
        // (null) rows. Best-effort per item — a failure throws and
        // surfaces to the AI rather than silently drifting.
        for (const [productId, next] of stockById) {
          if (next == null) continue;
          const { error: stockError } = await supabase
            .from("products")
            .update({ stock_count: next, in_stock: next > 0 })
            .eq("id", productId)
            .eq("business_id", business.id);
          if (stockError) throw new Error(stockError.message);
        }

        const patch: { name?: string; phone?: string } = {};
        // Never overwrite known details — only fill in blanks.
        if (!customer.name && customer_name?.trim())
          patch.name = customer_name.trim().slice(0, 200);
        if (!customer.phone && customer_phone?.trim())
          patch.phone = customer_phone.trim().slice(0, 50);
        if (Object.keys(patch).length > 0) {
          await supabase.from("customers").update(patch).eq("id", customerId);
        }

        // Fire-and-forget owner email — never blocks the AI response.
        // sendOrderNotification swallows its own errors; the trailing
        // .catch covers any unexpected rejection at the boundary.
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
          customerName: customer.name ?? customer_name?.trim() ?? null,
          customerPhone: customer.phone ?? customer_phone?.trim() ?? null,
        }).catch(() => {});

        return { order_id: order.id, total, currency: business.currency };
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
      },
    }),

    show_product_catalog: tool({
      description:
        "Show products as visual cards in the chat. Call when the customer wants to browse, or after greeting a new customer so they can see what's available.",
      inputSchema: z.object({
        query: z.string().optional().describe("Filter by product name"),
        limit: z.number().int().min(1).max(20).optional().describe("Max products, default 10"),
      }),
      execute: async ({ query, limit }) => {
        const clean = (query ?? "").replace(/[%_]/g, "").trim().slice(0, 100);
        let q = admin()
          .from("products")
          .select("id, public_id, name, price, image_url, in_stock")
          .eq("business_id", business.id)
          .order("created_at", { ascending: true })
          .limit(limit ?? 10);
        if (clean) q = q.ilike("name", `%${clean}%`);
        const { data, error } = await q;
        if (error) throw new Error(error.message);
        return {
          products: (data ?? []).map((p) => ({
            id: p.id,
            public_id: p.public_id,
            name: p.name,
            price: p.price,
            currency: business.currency,
            image_url: p.image_url,
            in_stock: p.in_stock,
          })),
        };
      },
    }),

    escalate_to_owner: tool({      description:
        "Hand the conversation to the business owner when unsure or the customer needs human help.",
      inputSchema: z.object({
        reason: z.string().describe("Why the owner is needed"),
      }),
      execute: async ({ reason }) => {
        const supabase = admin();
        await supabase
          .from("conversations")
          .update({ status: "escalated" })
          .eq("id", conversationId);
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          role: "system",
          content: `Customer needs attention: ${reason.slice(0, 500)}`,
        });
        return { ok: true };
      },
    }),
  };
}
