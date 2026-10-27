import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, Bell, ExternalLink, Globe, Link2, ShoppingBag, Store, Users } from "lucide-react";
import { getCurrentBusiness, getCurrentUser } from "@/lib/auth";
import { Pacifico } from "next/font/google";
import { timeAgo } from "@/lib/utils";
import { formatCurrency, formatNumber } from "@/lib/format";
import { StatCard } from "@/components/dashboard/stat-card";
import { OrderStatusBadge } from "@/components/dashboard/order-status-badge";
import { ShareLinkDialog } from "@/components/dashboard/share-link-dialog";
import { listOrders, type Order } from "../orders/actions";
import { getAnalytics } from "../analytics/analytics";
import { getNetCashFlow } from "../transactions/actions";
import { OverviewCharts } from "../overview-charts";

const pacifico = Pacifico({ subsets: ["latin"], weight: "400" });

function formatMoney(total: number, currency: string) {
  return formatCurrency(total, currency);
}

function itemsSummary(order: Order) {
  const names = order.items
    .map((i) => (i?.name ? `${i.name} × ${i.quantity ?? 1}` : null))
    .filter(Boolean) as string[];
  if (names.length === 0) return "No items";
  const first = names.slice(0, 2).join(", ");
  return names.length > 2 ? `${first} +${names.length - 2} more` : first;
}

export default async function OverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getCurrentBusiness();
  if (!business) redirect("/onboarding");

  const [allResult, pendingResult, stats, cashFlow] = await Promise.all([
    listOrders("all"),
    listOrders("pending"),
    getAnalytics(),
    getNetCashFlow("30d"),
  ]);
  if (!allResult.ok) throw new Error(allResult.error);
  const orders = allResult.orders;
  const pendingOrders = pendingResult.ok ? pendingResult.orders : [];

  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const publicUrl = `${proto}://${host}/b/${business.slug}`;

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 3600 * 1000;
  const twoWeeksAgo = now - 14 * 24 * 3600 * 1000;
  const monthAgo = now - 30 * 24 * 3600 * 1000;
  const counted = new Set(["approved", "fulfilled"]);
  const revenueTotal = orders
    .filter((o) => counted.has(o.status))
    .reduce((s, o) => s + Number(o.total || 0), 0);
  const revenueMonth = orders
    .filter((o) => counted.has(o.status) && new Date(o.created_at).getTime() >= monthAgo)
    .reduce((s, o) => s + Number(o.total || 0), 0);
  const customers = new Set(orders.map((o) => `${o.customer_name ?? "?"}|${o.customer_phone ?? "?"}`));

  const thisWeekRevenue = orders
    .filter((o) => counted.has(o.status) && new Date(o.created_at).getTime() >= weekAgo)
    .reduce((s, o) => s + Number(o.total || 0), 0);
  const lastWeekRevenue = orders
    .filter((o) => {
      const t = new Date(o.created_at).getTime();
      return counted.has(o.status) && t >= twoWeeksAgo && t < weekAgo;
    })
    .reduce((s, o) => s + Number(o.total || 0), 0);
  const wow = lastWeekRevenue > 0
    ? Math.round(((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100)
    : 100;

  const last14 = stats.daily.slice(-14).map((d) => ({ date: d.date, orders: d.orders, revenue: d.revenue }));
  const recent = orders.slice(0, 2);
  const top = stats.topProducts.slice(0, 2);
  const topMax = Math.max(1, ...top.map((t) => t.count));
  const cash = cashFlow.ok ? cashFlow.data : null;

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/rev.png" alt="logo" className="h-12 w-12 object-contain" />
          <div>
            <h1 className={`${pacifico.className} text-sm font-normal text-zinc-900 dark:text-zinc-100`}>{business.name}</h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
              {customers.size} customers • {pendingOrders.length} pending • 0 views
              <Globe size={12} />
              <ExternalLink size={12} />
            </p>
          </div>
        </div>
      </div>

      {/* Main Number */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600 dark:text-zinc-400">Revenue</span>
          <Globe size={14} className="text-gray-400" />
          <Store size={14} className="text-gray-400" />
        </div>
        <div className="mt-2 flex items-end gap-3">
          <span className="text-4xl tracking-tight text-zinc-900 dark:text-zinc-100">
            {formatMoney(Math.round(revenueTotal * 100) / 100, business.currency)}
          </span>
          <span className={`mb-2 rounded-full px-2.5 py-0.5 text-xs font-semibold ${wow >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {wow >= 0 ? "+" : ""}{wow}%
          </span>
        </div>
      </div>

      {/* Chart */}
      <OverviewCharts daily={last14} />

      {/* Secondary grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-white dark:bg-zinc-950">
          <StatCard title="Pending orders" value={String(pendingOrders.length)} trend={pendingOrders.length > 0 ? "Needs your review" : "All caught up"} variant="blue" icon={Bell} contentClassName="p-2 md:p-3" className="rounded-xl" />
        </div>
        <div className="rounded-2xl bg-white dark:bg-zinc-950">
          <StatCard title="Total customers" value={String(customers.size)} variant="white" icon={Users} contentClassName="p-2 md:p-3" className="rounded-xl" />
        </div>

        <div className="rounded-2xl bg-white dark:bg-zinc-950 space-y-3">
          <p className="text-sm font-medium text-gray-600 dark:text-zinc-400">Recent orders</p>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-500">No orders yet.</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-zinc-800">
              {recent.map((o) => (
                <div key={o.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="truncate font-medium">{o.customer_name || "Anonymous customer"}</span>
                  <span className="text-gray-500">{formatMoney(o.total, o.currency)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white dark:bg-zinc-950 space-y-3">
          <p className="text-sm font-medium text-gray-600 dark:text-zinc-400">Top products</p>
          {top.length === 0 ? (
            <p className="text-sm text-gray-500">No product data yet.</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-zinc-800">
              {top.map((p) => (
                <div key={p.name} className="flex items-center justify-between py-2 text-sm">
                  <span className="truncate font-medium">{p.name}</span>
                  <span className="text-gray-500">{formatNumber(p.count)} order{p.count === 1 ? "" : "s"}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {cash && (
          <div className="rounded-2xl bg-white dark:bg-zinc-950 space-y-3 md:col-span-2">
            <p className="text-sm font-medium text-gray-600 dark:text-zinc-400">Income vs Expenses (30d)</p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Income</p>
                <p className="font-semibold">{formatMoney(cash.income, cash.currency)}</p>
              </div>
              <div>
                <p className="text-gray-500">Expenses</p>
                <p className="font-semibold">{formatMoney(cash.expenses, cash.currency)}</p>
              </div>
              <div>
                <p className="text-gray-500">Chat conversion</p>
                <p className="font-semibold">{stats.conversionRate}%</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <ShareLinkDialog url={publicUrl} />
      </div>
    </div>
  );
}
