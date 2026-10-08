import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/auth";

export type DailyPoint = {
  date: string;
  orders: number;
  revenue: number;
};

export type AnalyticsSummary = {
  totalOrders: number;
  totalRevenue: number;
  repeatCustomers: number;
  conversionRate: number;
  conversationsTotal: number;
  daily: DailyPoint[];
  topProducts: { name: string; count: number }[];
};

const WINDOW_ROWS = 1000;
const COUNTED_STATUSES = ["approved", "fulfilled"];

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Aggregate recent rows in TypeScript. Caps at the newest 1000 orders. Resolves the caller's business from the session — never accepts a business ID argument. */
export async function getAnalytics(windowDays = 90): Promise<AnalyticsSummary> {
  const business = await getCurrentBusiness();
  if (!business) throw new Error("No business found");
  const businessId = business.id;
  const supabase = await createClient();

  const [{ count: totalOrders }, { count: conversationsTotal }, { data: orders }] =
    await Promise.all([
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId),
      supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId),
      supabase
        .from("orders")
        .select("id, total, status, created_at, items, customer_id, conversation_id")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(WINDOW_ROWS),
    ]);

  const rows = orders ?? [];

  // Windowed buckets, oldest first.
  const days = windowDays === 7 ? 7 : windowDays === 30 ? 30 : 90;
  const daily: DailyPoint[] = [];
  const byDay = new Map<string, DailyPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const point = { date: dayKey(d), orders: 0, revenue: 0 };
    daily.push(point);
    byDay.set(point.date, point);
  }

  let totalRevenue = 0;
  const ordersByCustomer = new Map<string, number>();
  const ordersByProduct = new Map<string, number>();
  const conversationsWithOrders = new Set<string>();

  for (const o of rows) {
    const counted = COUNTED_STATUSES.includes(o.status);
    const total = Number(o.total) || 0;
    if (counted) {
      totalRevenue = Math.round((totalRevenue + total) * 100) / 100;
      const bucket = byDay.get(dayKey(new Date(o.created_at)));
      if (bucket) {
        bucket.orders += 1;
        bucket.revenue = Math.round((bucket.revenue + total) * 100) / 100;
      }
    }
    if (o.customer_id) {
      ordersByCustomer.set(
        o.customer_id,
        (ordersByCustomer.get(o.customer_id) ?? 0) + 1
      );
    }
    if (o.conversation_id) conversationsWithOrders.add(o.conversation_id);
    if (Array.isArray(o.items)) {
      const seen = new Set<string>();
      for (const item of o.items) {
        const name =
          (item as { name?: string })?.name?.trim() ||
          (item as { product_id?: string })?.product_id ||
          "Unknown";
        if (!seen.has(name)) {
          seen.add(name);
          ordersByProduct.set(name, (ordersByProduct.get(name) ?? 0) + 1);
        }
      }
    }
  }

  const repeatCustomers = [...ordersByCustomer.values()].filter(
    (n) => n >= 2
  ).length;
  const convTotal = conversationsTotal ?? 0;
  const conversionRate =
    convTotal === 0
      ? 0
      : Math.round((conversationsWithOrders.size / convTotal) * 1000) / 10;

  const topProducts = [...ordersByProduct.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalOrders: totalOrders ?? 0,
    totalRevenue,
    repeatCustomers,
    conversionRate,
    conversationsTotal: convTotal,
    daily,
    topProducts,
  };
}
