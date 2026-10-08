import { tool } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAnalytics } from "@/app/dashboard/analytics/analytics";
import {
  listOrders,
  approveOrder,
  declineOrder,
  updateOrderNote,
  getPendingOrderCount,
} from "@/app/dashboard/orders/actions";
import {
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/app/dashboard/products/actions";
import { updateBusinessSettings } from "@/app/dashboard/settings/actions";
import {
  listInventory,
  adjustStock,
} from "@/app/dashboard/inventory/actions";

export type AssistantBusiness = {
  id: string;
  name: string;
  currency: string;
  slug: string;
};

const RANGE_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

function rangeDays(range: string | undefined, fallback: number): number {
  if (range === "7d") return 7;
  if (range === "30d") return 30;
  if (range === "90d") return 90;
  return fallback;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function itemsSummary(items: unknown): string {
  if (!Array.isArray(items) || items.length === 0) return "No items";
  const names = items
    .map((i) => {
      const row = i as { name?: string; quantity?: number };
      return row?.name ? `${row.name} × ${row.quantity ?? 1}` : null;
    })
    .filter(Boolean) as string[];
  if (names.length === 0) return "No items";
  const first = names.slice(0, 2).join(", ");
  return names.length > 2 ? `${first} +${names.length - 2} more` : first;
}

function needsConfirmation(confirmed: unknown) {
  return confirmed !== true;
}

/**
 * Tools for the dashboard assistant. Every tool resolves the business from
 * the session-owned closure — the model NEVER supplies a business ID.
 * Reads use the user-scoped client (RLS enforced). Writes delegate to the
 * existing business-scoped server actions and require confirmed: true.
 */
export function createAssistantTools(opts: { business: AssistantBusiness }) {
  const { business } = opts;

  return {
    // ---------------- READ TOOLS ----------------

    get_sales_summary: tool({
      description:
        "Sales totals plus per-day orders and revenue for a range. Use for 'how much did I sell' questions.",
      inputSchema: z.object({
        range: z.enum(["7d", "30d", "90d"]).optional().describe("Time range, default 7d"),
      }),
      execute: async ({ range }) => {
        const days = rangeDays(range, 7);
        const stats = await getAnalytics(days);
        return {
          total_orders: stats.totalOrders,
          total_revenue: stats.totalRevenue,
          currency: business.currency,
          range: range ?? "7d",
          daily: stats.daily.slice(-days),
        };
      },
    }),

    get_orders: tool({
      description: "List orders with customer names. Defaults to pending orders.",
      inputSchema: z.object({
        status: z
          .enum(["pending", "approved", "declined", "all"])
          .optional()
          .describe("Filter by status, default pending"),
        limit: z.number().int().min(1).max(50).optional().describe("Max orders, default 10"),
      }),
      execute: async ({ status, limit }) => {
        const result = await listOrders(status ?? "pending");
        if (!result.ok) throw new Error(result.error);
        const n = limit ?? 10;
        return {
          orders: result.orders.slice(0, n).map((o) => ({
            id: o.id,
            customer_name: o.customer_name || "Anonymous customer",
            customer_phone: o.customer_phone,
            items_summary: itemsSummary(o.items),
            total: o.total,
            currency: o.currency,
            status: o.status,
            created_at: o.created_at,
          })),
        };
      },
    }),

    get_order_detail: tool({
      description: "Full detail for one order: summary, customer, and the last 20 chat messages.",
      inputSchema: z.object({
        order_id: z.string().describe("Order ID from a previous get_orders call"),
      }),
      execute: async ({ order_id }) => {
        const supabase = await createClient();
        const { data: order, error } = await supabase
          .from("orders")
          .select("id, total, currency, status, items, owner_note, created_at, customer_id, conversation_id")
          .eq("id", order_id)
          .eq("business_id", business.id)
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (!order) throw new Error("Order not found.");
        let customer: { name: string | null; phone: string | null } | null = null;
        if (order.customer_id) {
          const { data } = await supabase
            .from("customers")
            .select("name, phone")
            .eq("id", order.customer_id)
            .maybeSingle();
          if (data) customer = data;
        }
        let messages: { role: string; content: string; created_at: string }[] = [];
        if (order.conversation_id) {
          const { data } = await supabase
            .from("messages")
            .select("role, content, created_at")
            .eq("conversation_id", order.conversation_id)
            .order("created_at", { ascending: false })
            .limit(20);
          messages = (data ?? []).reverse();
        }
        return {
          order: {
            id: order.id,
            total: order.total,
            currency: order.currency,
            status: order.status,
            items_summary: itemsSummary(order.items),
            owner_note: order.owner_note,
            created_at: order.created_at,
          },
          customer,
          messages,
        };
      },
    }),

    get_top_products: tool({
      description: "Best-selling products in a range, aggregated from order items.",
      inputSchema: z.object({
        range: z.enum(["7d", "30d", "90d"]).optional().describe("Time range, default 30d"),
        limit: z.number().int().min(1).max(20).optional().describe("Max products, default 5"),
      }),
      execute: async ({ range, limit }) => {
        const days = rangeDays(range, 30);
        const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
        const supabase = await createClient();
        const { data, error } = await supabase
          .from("orders")
          .select("items")
          .eq("business_id", business.id)
          .in("status", ["approved", "fulfilled"])
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(1000);
        if (error) throw new Error(error.message);
        const agg = new Map<string, { count: number; revenue: number }>();
        for (const o of data ?? []) {
          if (!Array.isArray(o.items)) continue;
          const seen = new Set<string>();
          for (const item of o.items) {
            const row = item as { name?: string; quantity?: number; unit_price?: number };
            const name = row?.name?.trim() || "Unknown";
            const entry = agg.get(name) ?? { count: 0, revenue: 0 };
            if (!seen.has(name)) {
              seen.add(name);
              entry.count += 1;
            }
            entry.revenue =
              Math.round((entry.revenue + (Number(row.unit_price) || 0) * (Number(row.quantity) || 0)) * 100) / 100;
            agg.set(name, entry);
          }
        }
        const products = [...agg.entries()]
          .map(([name, v]) => ({ name, count: v.count, revenue: v.revenue }))
          .sort((a, b) => b.count - a.count)
          .slice(0, limit ?? 5);
        return { products, currency: business.currency, range: range ?? "30d" };
      },
    }),

    get_customer_count: tool({
      description: "How many customers the shop has, plus new ones this week and month.",
      inputSchema: z.object({}),
      execute: async () => {
        const supabase = await createClient();
        const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
        const monthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
        const base = supabase.from("customers").select("id", { count: "exact", head: true }).eq("business_id", business.id);
        const [{ count: total }, { count: week }, { count: month }] = await Promise.all([
          base,
          supabase.from("customers").select("id", { count: "exact", head: true }).eq("business_id", business.id).gte("created_at", weekAgo),
          supabase.from("customers").select("id", { count: "exact", head: true }).eq("business_id", business.id).gte("created_at", monthAgo),
        ]);
        return { total: total ?? 0, new_this_week: week ?? 0, new_this_month: month ?? 0 };
      },
    }),

    get_customer_list: tool({
      description: "Customers with order counts and total spent.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).optional().describe("Max customers, default 10"),
      }),
      execute: async ({ limit }) => {
        const supabase = await createClient();
        const { data: customers, error } = await supabase
          .from("customers")
          .select("id, name, phone, created_at")
          .eq("business_id", business.id)
          .order("created_at", { ascending: false })
          .limit(limit ?? 10);
        if (error) throw new Error(error.message);
        const { data: orders } = await supabase
          .from("orders")
          .select("customer_id, total")
          .eq("business_id", business.id)
          .limit(1000);
        const spend = new Map<string, { count: number; total: number }>();
        for (const o of orders ?? []) {
          if (!o.customer_id) continue;
          const e = spend.get(o.customer_id) ?? { count: 0, total: 0 };
          e.count += 1;
          e.total = Math.round((e.total + (Number(o.total) || 0)) * 100) / 100;
          spend.set(o.customer_id, e);
        }
        return {
          customers: (customers ?? []).map((c) => ({
            name: c.name || "Anonymous",
            phone: c.phone,
            order_count: spend.get(c.id)?.count ?? 0,
            total_spent: spend.get(c.id)?.total ?? 0,
            currency: business.currency,
          })),
        };
      },
    }),

    get_business_info: tool({
      description: "The shop's profile: name, description, hours, policies, currency, notification email, slug.",
      inputSchema: z.object({}),
      execute: async () => {
        const supabase = await createClient();
        const { data, error } = await supabase
          .from("businesses")
          .select("name, description, hours, policies, currency, notification_email, slug")
          .eq("id", business.id)
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) throw new Error("Business not found.");
        return data;
      },
    }),

    get_public_link: tool({
      description: "The public chat link customers use to reach this shop.",
      inputSchema: z.object({}),
      execute: async () => {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        return { url: `${appUrl}/b/${business.slug}` };
      },
    }),

    get_pending_order_count: tool({
      description: "How many orders are waiting for review.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await getPendingOrderCount();
        if (!result.ok) throw new Error(result.error);
        return { count: result.count };
      },
    }),

    get_revenue_trend: tool({
      description: "Per-day revenue for charting a range.",
      inputSchema: z.object({
        range: z.enum(["7d", "30d", "90d"]).optional().describe("Time range, default 30d"),
      }),
      execute: async ({ range }) => {
        const days = rangeDays(range, 30);
        const stats = await getAnalytics(days);
        return {
          currency: business.currency,
          range: range ?? "30d",
          daily: stats.daily.slice(-days).map((d) => ({ date: d.date, revenue: d.revenue })),
        };
      },
    }),

    get_conversion_stats: tool({
      description: "What share of customer conversations turned into orders.",
      inputSchema: z.object({
        range: z.enum(["30d", "90d"]).optional().describe("Time range, default 30d"),
      }),
      execute: async ({ range }) => {
        const days = rangeDays(range, 30);
        const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
        const supabase = await createClient();
        const [{ count: conversations }, { data: orders }] = await Promise.all([
          supabase.from("conversations").select("id", { count: "exact", head: true }).eq("business_id", business.id).gte("created_at", since),
          supabase.from("orders").select("conversation_id").eq("business_id", business.id).gte("created_at", since).limit(1000),
        ]);
        const withOrders = new Set((orders ?? []).map((o) => o.conversation_id).filter(Boolean));
        const total = conversations ?? 0;
        return {
          total_conversations: total,
          conversations_with_orders: withOrders.size,
          conversion_rate: total === 0 ? 0 : Math.round((withOrders.size / total) * 1000) / 10,
          range: range ?? "30d",
        };
      },
    }),

    search_products: tool({
      description: "Search the product catalog by name.",
      inputSchema: z.object({
        query: z.string().describe("Product name or keyword"),
      }),
      execute: async ({ query }) => {
        const clean = query.replace(/[%_]/g, "").trim().slice(0, 100);
        const supabase = await createClient();
        const { data, error } = await supabase
          .from("products")
          .select("id, name, price, in_stock, stock_count")
          .eq("business_id", business.id)
          .ilike("name", `%${clean}%`)
          .limit(10);
        if (error) throw new Error(error.message);
        return (data ?? []).map((p) => ({ id: p.id, name: p.name, price: p.price, in_stock: p.in_stock, stock_count: p.stock_count, currency: business.currency }));
      },
    }),

    get_low_stock_products: tool({
      description: "Products running low: stock above 0 but at or below their threshold. Use for 'what's running low' questions.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await listInventory();
        if (!result.ok) throw new Error(result.error);
        return {
          products: result.products
            .filter(
              (p) =>
                p.stock_count != null &&
                p.stock_count > 0 &&
                p.stock_count <= (p.low_stock_threshold ?? 3)
            )
            .map((p) => ({
              id: p.id,
              name: p.name,
              stock_count: p.stock_count,
              low_stock_threshold: p.low_stock_threshold ?? 3,
              price: p.price,
              currency: business.currency,
            })),
        };
      },
    }),

    get_out_of_stock_products: tool({
      description: "Products with zero stock.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await listInventory();
        if (!result.ok) throw new Error(result.error);
        return {
          products: result.products
            .filter((p) => p.stock_count === 0)
            .map((p) => ({
              id: p.id,
              name: p.name,
              price: p.price,
              currency: business.currency,
            })),
        };
      },
    }),

    adjust_product_stock: tool({
      description: "Adjust a product's stock by a delta (positive adds, negative removes). Only call after the user explicitly confirmed.",
      inputSchema: z.object({
        product_id: z.string().describe("Product ID from a previous search_products call"),
        delta: z.number().int().describe("Whole-number change, e.g. 10 to add ten, -2 to remove two"),
        confirmed: z.boolean().describe("Must be true. Pass true ONLY after the user explicitly said yes/confirm/go ahead."),
      }),
      execute: async ({ product_id, delta, confirmed }) => {
        if (needsConfirmation(confirmed)) return { ok: false, error: "User confirmation required" };
        return adjustStock(product_id, delta);
      },
    }),

    // ---------------- WRITE TOOLS (confirmation-gated) ----------------

    approve_order: tool({
      description: "Approve a pending order. Only call after the user explicitly confirmed.",
      inputSchema: z.object({
        order_id: z.string(),
        confirmed: z.boolean().describe("Must be true. Pass true ONLY after the user explicitly said yes/confirm/go ahead."),
      }),
      execute: async ({ order_id, confirmed }) => {
        if (needsConfirmation(confirmed)) return { ok: false, error: "User confirmation required" };
        return approveOrder(order_id);
      },
    }),

    decline_order: tool({
      description: "Decline a pending order, optionally with a reason. Only call after the user explicitly confirmed.",
      inputSchema: z.object({
        order_id: z.string(),
        reason: z.string().optional(),
        confirmed: z.boolean().describe("Must be true. Pass true ONLY after the user explicitly said yes/confirm/go ahead."),
      }),
      execute: async ({ order_id, reason, confirmed }) => {
        if (needsConfirmation(confirmed)) return { ok: false, error: "User confirmation required" };
        return declineOrder(order_id, reason);
      },
    }),

    create_product: tool({
      description: "Create a product. Only call after the user explicitly confirmed name and price.",
      inputSchema: z.object({
        name: z.string(),
        price: z.number(),
        description: z.string().optional(),
        confirmed: z.boolean().describe("Must be true. Pass true ONLY after the user explicitly said yes/confirm/go ahead."),
      }),
      execute: async ({ name, price, description, confirmed }) => {
        if (needsConfirmation(confirmed)) return { ok: false, error: "User confirmation required" };
        return createProduct({ name, price, description });
      },
    }),

    update_product: tool({
      description: "Update a product's fields. Only call after the user explicitly confirmed.",
      inputSchema: z.object({
        id: z.string().describe("Product ID from a previous search_products call"),
        name: z.string().optional(),
        price: z.number().optional(),
        description: z.string().optional(),
        in_stock: z.boolean().optional(),
        confirmed: z.boolean().describe("Must be true. Pass true ONLY after the user explicitly said yes/confirm/go ahead."),
      }),
      execute: async ({ id, name, price, description, in_stock, confirmed }) => {
        if (needsConfirmation(confirmed)) return { ok: false, error: "User confirmation required" };
        const patch: { name?: string; price?: number | string; description?: string | null; in_stock?: boolean } = {};
        if (name !== undefined) patch.name = name;
        if (price !== undefined) patch.price = price;
        if (description !== undefined) patch.description = description;
        if (in_stock !== undefined) patch.in_stock = in_stock;
        if (Object.keys(patch).length === 0) return { ok: false, error: "Nothing to update — no fields provided." };
        return updateProduct(id, patch);
      },
    }),

    delete_product: tool({
      description: "Delete a product permanently. Only call after the user explicitly confirmed.",
      inputSchema: z.object({
        id: z.string().describe("Product ID from a previous search_products call"),
        confirmed: z.boolean().describe("Must be true. Pass true ONLY after the user explicitly said yes/confirm/go ahead."),
      }),
      execute: async ({ id, confirmed }) => {
        if (needsConfirmation(confirmed)) return { ok: false, error: "User confirmation required" };
        return deleteProduct(id);
      },
    }),

    update_business_settings: tool({
      description: "Update shop hours, policies, or notification email. Only call after the user explicitly confirmed the new values.",
      inputSchema: z.object({
        hours: z.string().optional(),
        policies: z.string().optional(),
        notification_email: z.string().optional(),
        confirmed: z.boolean().describe("Must be true. Pass true ONLY after the user explicitly said yes/confirm/go ahead."),
      }),
      execute: async ({ hours, policies, notification_email, confirmed }) => {
        if (needsConfirmation(confirmed)) return { ok: false, error: "User confirmation required" };
        // updateBusinessSettings requires name and overwrites omitted fields
        // with null, so merge against the current row first.
        const supabase = await createClient();
        const { data: current, error } = await supabase
          .from("businesses")
          .select("name, description, hours, policies, notification_email")
          .eq("id", business.id)
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (!current) throw new Error("Business not found.");
        return updateBusinessSettings({
          name: current.name,
          description: current.description,
          hours: hours ?? current.hours,
          policies: policies ?? current.policies,
          notification_email: notification_email ?? current.notification_email,
        });
      },
    }),

    update_order_note: tool({
      description: "Save a private note on an order. Only call after the user explicitly confirmed.",
      inputSchema: z.object({
        order_id: z.string(),
        note: z.string(),
        confirmed: z.boolean().describe("Must be true. Pass true ONLY after the user explicitly said yes/confirm/go ahead."),
      }),
      execute: async ({ order_id, note, confirmed }) => {
        if (needsConfirmation(confirmed)) return { ok: false, error: "User confirmation required" };
        return updateOrderNote(order_id, note);
      },
    }),
  };
}

export type AssistantTools = ReturnType<typeof createAssistantTools>;
