import { tool } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPendingOrder } from "@/lib/chat/order";
import {
  clampListItems,
  reply,
  type InteractiveListItem,
} from "@/lib/chat/interactive";

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
 *
 * Bookend architecture: the model only ever opens (start_shopping_flow) or
 * closes (the conclusion) a transaction. It never generates the middle steps —
 * quantity and confirmation are rigid GUI messages produced by
 * `POST /api/chat/interact`, never by the model.
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

    /**
     * The single entry point into the GUI-driven shopping flow.
     *
     * The model calls this and then STOPS — it does not describe products in
     * text. The catalogue is queried here (server-side, no model in the loop)
     * and returned as the items the frontend renders as a clickable list.
     */
    start_shopping_flow: tool({
      description:
        "Call this when the customer wants to browse or buy. Do not list products in text. This hands control to a clickable product list; never describe or compare products yourself.",
      inputSchema: z.object({}),
      execute: async () => {
        const { data, error } = await admin()
          .from("products")
          .select("id, public_id, name, price, image_url, in_stock")
          .eq("business_id", business.id)
          .order("in_stock", { ascending: false })
          .order("created_at", { ascending: true })
          .limit(10);
        if (error) throw new Error(error.message);

        const items: InteractiveListItem[] = (data ?? []).map((p) => ({
          id: reply.selectProduct(p.public_id ?? p.id),
          name: p.name,
          price: Number(p.price),
          currency: business.currency,
          image_url: p.image_url ?? null,
          in_stock: p.in_stock !== false,
          public_id: p.public_id ?? null,
        }));

        // `ok`/`action` are the contract the route intercepts on; `items`
        // lets the frontend render the list straight from the streamed tool
        // output with no second round-trip.
        return {
          ok: true,
          action: "render_product_list",
          title: `What would you like from ${business.name}?`,
          items: clampListItems(items),
        };
      },
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
          .select("id, public_id, name, price, in_stock, stock_count, description, details")
          .eq("business_id", business.id)
          .ilike("name", `%${clean}%`)
          .limit(10);
        if (error) throw new Error(error.message);
        return (data ?? []).map((p) => ({
          id: p.id,
          public_id: p.public_id,
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
        // Shared with the GUI flow so both paths apply the same stock gate,
        // free-tier quota and owner notification.
        const result = await createPendingOrder({
          business: { id: business.id, currency: business.currency },
          conversationId,
          customerId,
          customer,
          items,
          customerName: customer_name,
          customerPhone: customer_phone,
        });
        if (!result.ok) return { ok: false, error: result.error };
        return {
          order_id: result.order_id,
          total: result.total,
          currency: result.currency,
        };
      },
    }),

    show_product_catalog: tool({
      description:
        "Show products as visual cards in the chat. Prefer start_shopping_flow when the customer wants to buy; this remains for greeting a new customer.",
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
