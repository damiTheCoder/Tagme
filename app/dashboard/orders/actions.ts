"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type OrderItem = {
  product_id?: string;
  name?: string;
  quantity?: number;
  unit_price?: number;
};

export type Order = {
  id: string;
  business_id: string;
  total: number;
  currency: string;
  status: string;
  items: OrderItem[];
  conversation_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  owner_note: string | null;
  created_at: string;
};

export type OrdersResult =
  | { ok: true; orders: Order[] }
  | { ok: false; error: string };

export type OrderActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type OrderCountResult =
  | { ok: true; count: number }
  | { ok: false; error: string };

const VALID_FILTERS = ["pending", "approved", "declined", "all"] as const;
export type OrderFilter = (typeof VALID_FILTERS)[number];

export async function listOrders(
  filter: OrderFilter = "all"
): Promise<OrdersResult> {
  try {
    const business = await getCurrentBusiness();
    if (!business) throw new Error("No business found.");
    if (!VALID_FILTERS.includes(filter)) throw new Error("Invalid filter.");

    const supabase = await createClient();
    let query = supabase
      .from("orders")
      .select(
        "id, business_id, total, currency, status, items, conversation_id, owner_note, created_at, customers ( name, phone )"
      )
      .eq("business_id", business.id)
      .order("created_at", { ascending: false });

    if (filter !== "all") query = query.eq("status", filter);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const orders: Order[] = (data ?? []).map((row) => {
      const customer = row.customers as
        | { name: string | null; phone: string | null }
        | { name: string | null; phone: string | null }[]
        | null;
      const first = Array.isArray(customer) ? customer[0] : customer;
      return {
        id: row.id,
        business_id: row.business_id,
        total: row.total,
        currency: row.currency,
        status: row.status,
        items: Array.isArray(row.items) ? row.items : [],
        conversation_id: row.conversation_id,
        customer_name: first?.name ?? null,
        customer_phone: first?.phone ?? null,
        owner_note: row.owner_note,
        created_at: row.created_at,
      };
    });
    return { ok: true, orders };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to load orders.",
    };
  }
}

async function touchConversation(conversationId: string | null) {
  if (!conversationId) return;
  const admin = createAdminClient();
  await admin
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);
}

async function notifyCustomer(
  conversationId: string | null,
  content: string
): Promise<void> {
  if (!conversationId) return;
  // Admin client: the customer has no owner session, so RLS would block
  // a user-scoped insert. The order itself was verified via RLS above.
  const admin = createAdminClient();
  const { error } = await admin.from("messages").insert({
    conversation_id: conversationId,
    role: "system",
    content,
  });
  if (error) throw new Error(error.message);
  await touchConversation(conversationId);
}

export async function approveOrder(id: string): Promise<OrderActionResult> {
  try {
    const business = await getCurrentBusiness();
    if (!business) throw new Error("No business found.");
    if (!id) throw new Error("Order id is required.");

    const supabase = await createClient();
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, status, conversation_id")
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!order) throw new Error("Order not found.");

    const { data: updated, error: updateError } = await supabase
      .from("orders")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("business_id", business.id)
      .select("id, status");
    // NOTE: PostgREST returns NO error when 0 rows match, so this
    // explicit check is what surfaces RLS/filter blocks.
    if (updateError) throw new Error(updateError.message);
    if (!updated || updated.length === 0) {
      return { ok: false, error: "Order not found or not authorized" };
    }

    await notifyCustomer(
      order.conversation_id,
      `Your order was approved by ${business.name} ✅`
    );

    revalidatePath("/dashboard/orders");
    revalidatePath(`/dashboard/orders/${id}`);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to approve order.",
    };
  }
}

export async function declineOrder(
  id: string,
  reason?: string
): Promise<OrderActionResult> {
  try {
    const business = await getCurrentBusiness();
    if (!business) throw new Error("No business found.");
    if (!id) throw new Error("Order id is required.");

    const note = reason?.trim() ? reason.trim().slice(0, 500) : null;

    const supabase = await createClient();
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, status, conversation_id")
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!order) throw new Error("Order not found.");

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "declined",
        owner_note: note,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("business_id", business.id);
    if (updateError) throw new Error(updateError.message);

    await notifyCustomer(
      order.conversation_id,
      `Sorry, your order couldn't be fulfilled. ${business.name} will be in touch.`
    );

    revalidatePath("/dashboard/orders");
    revalidatePath(`/dashboard/orders/${id}`);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to decline order.",
    };
  }
}

export async function updateOrderNote(
  id: string,
  note: string
): Promise<OrderActionResult> {
  try {
    const business = await getCurrentBusiness();
    if (!business) throw new Error("No business found.");
    if (!id) throw new Error("Order id is required.");

    const trimmed =
      typeof note === "string" ? note.trim().slice(0, 500) : "";
    const owner_note = trimmed ? trimmed : null;

    const supabase = await createClient();
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id")
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!order) throw new Error("Order not found.");

    const { error: updateError } = await supabase
      .from("orders")
      .update({ owner_note })
      .eq("id", id)
      .eq("business_id", business.id);
    if (updateError) throw new Error(updateError.message);

    revalidatePath("/dashboard/orders");
    revalidatePath(`/dashboard/orders/${id}`);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save note.",
    };
  }
}

export async function getPendingOrderCount(): Promise<OrderCountResult> {  try {
    const business = await getCurrentBusiness();
    if (!business) throw new Error("No business found.");

    const supabase = await createClient();
    const { count, error } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true, count: count ?? 0 };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to count orders.",
    };
  }
}
