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
          .select("id, name, price, in_stock")
          .eq("business_id", business.id)
          .ilike("name", `%${clean}%`)
          .limit(10);
        if (error) throw new Error(error.message);
        return (data ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          in_stock: p.in_stock,
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
        const supabase = admin();
        const ids = [...new Set(items.map((i) => i.product_id))];
        const { data: products, error: lookupError } = await supabase
          .from("products")
          .select("id, name, price")
          .eq("business_id", business.id)
          .in("id", ids);
        if (lookupError) throw new Error(lookupError.message);
        const byId = new Map((products ?? []).map((p) => [p.id, p]));
        for (const id of ids) {
          if (!byId.has(id)) throw new Error("A product was not found.");
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
      },
    }),

    escalate_to_owner: tool({
      description:
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
