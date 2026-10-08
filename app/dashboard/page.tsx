import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, Link2, ShoppingBag } from "lucide-react";
import { getCurrentBusiness, getCurrentUser } from "@/lib/auth";
import { timeAgo } from "@/lib/utils";
import { formatCurrency, formatNumber } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { OrderStatusBadge } from "@/components/dashboard/order-status-badge";
import { ShareLinkDialog } from "@/components/dashboard/share-link-dialog";
import { LazyAssistantBar as AssistantBar } from "@/components/dashboard/assistant/assistant-bar-lazy";
import { listOrders, type Order } from "./orders/actions";
import { getAnalytics } from "./analytics/analytics";
import { OverviewCharts } from "./overview-charts";

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

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getCurrentBusiness();
  if (!business) redirect("/onboarding");

  const [allResult, pendingResult, stats] = await Promise.all([
    listOrders("all"),
    listOrders("pending"),
    getAnalytics(),
  ]);
  if (!allResult.ok) throw new Error(allResult.error);
  const orders = allResult.orders;
  const pendingOrders = pendingResult.ok ? pendingResult.orders : [];

  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const publicUrl = `${proto}://${host}/b/${business.slug}`;

  if (orders.length === 0) {
    return (
      <div className="space-y-4 md:space-y-6">
        <AssistantBar business={business} />
        <PageHeader title={`Welcome, ${business.name}`} description="Here's what's happening in your shop today." />
        <EmptyState
          icon={ShoppingBag}
          title="No orders yet"
          description="Share your link on Instagram, WhatsApp status, or your bio to start taking orders."
          action={<ShareLinkDialog url={publicUrl} />}
        />
      </div>
    );
  }

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 3600 * 1000;
  const twoWeeksAgo = now - 14 * 24 * 3600 * 1000;
  const monthAgo = now - 30 * 24 * 3600 * 1000;
  const thisWeek = orders.filter((o) => new Date(o.created_at).getTime() >= weekAgo);
  const lastWeek = orders.filter((o) => {
    const t = new Date(o.created_at).getTime();
    return t >= twoWeeksAgo && t < weekAgo;
  });
  const counted = new Set(["approved", "fulfilled"]);
  const revenueMonth = orders
    .filter((o) => counted.has(o.status) && new Date(o.created_at).getTime() >= monthAgo)
    .reduce((s, o) => s + Number(o.total || 0), 0);
  const customers = new Set(orders.map((o) => `${o.customer_name ?? "?"}|${o.customer_phone ?? "?"}`));

  const weekTrend =
    lastWeek.length > 0
      ? `+${Math.round(((thisWeek.length - lastWeek.length) / lastWeek.length) * 100)}% vs last week`
      : `${thisWeek.length} this week`;

  const last14 = stats.daily.slice(-14).map((d) => ({ date: d.date, orders: d.orders, revenue: d.revenue }));
  const recent = orders.slice(0, 5);
  const top = stats.topProducts.slice(0, 5);
  const topMax = Math.max(1, ...top.map((t) => t.count));

  return (
    <div className="space-y-4 md:space-y-6">
      <AssistantBar business={business} />
      <PageHeader
        title={`Welcome, ${business.name}`}
        description="Here's what's happening in your shop today."
        action={
          <Link href={`/b/${business.slug}`} target="_blank" className="text-sm text-[#0066ff] hover:underline inline-flex items-center gap-1">
            <Link2 size={16} /> View public page
          </Link>
        }
      />

      <div className="grid gap-0 sm:grid-cols-2 sm:gap-3 md:gap-4 lg:grid-cols-4 [&>*:last-child]:border-b-0">
        <StatCard title="Pending orders" value={String(pendingOrders.length)} trend={pendingOrders.length > 0 ? "Needs your review" : "All caught up"} className="rounded-none border-b border-zinc-200 bg-white bg-none shadow-none sm:rounded-2xl sm:border-0 md:bg-gradient-to-br md:from-gray-100 md:to-gray-200" contentClassName="px-0 py-3 md:p-5" />
        <StatCard title="Orders this week" value={String(thisWeek.length)} trend={weekTrend} trendTone={thisWeek.length >= lastWeek.length ? "up" : "down"} className="rounded-none border-b border-zinc-200 bg-white bg-none shadow-none sm:rounded-2xl sm:border-0 md:bg-gradient-to-br md:from-gray-100 md:to-gray-200" contentClassName="px-0 py-3 md:p-5" />
        <StatCard title="Revenue this month" value={formatMoney(Math.round(revenueMonth * 100) / 100, business.currency)} className="rounded-none border-b border-zinc-200 bg-white bg-none shadow-none sm:rounded-2xl sm:border-0 md:bg-gradient-to-br md:from-gray-100 md:to-gray-200" contentClassName="px-0 py-3 md:p-5" />
        <StatCard title="Total customers" value={String(customers.size)} className="rounded-none border-b border-zinc-200 bg-white bg-none shadow-none sm:rounded-2xl sm:border-0 md:bg-gradient-to-br md:from-gray-100 md:to-gray-200" contentClassName="px-0 py-3 md:p-5" />
      </div>

      <OverviewCharts daily={last14} />

      <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
        <Card className="border-0 bg-white bg-none shadow-none md:border-0 md:bg-gradient-to-br md:from-gray-100 md:to-gray-200">
          <CardHeader className="flex flex-row items-center justify-between px-0 pt-0 md:p-6">
            <CardTitle>Recent orders</CardTitle>
            <Link href="/dashboard/orders" className="inline-flex items-center gap-1 text-sm text-[#0066ff] hover:underline">
              View all <ArrowRight size={16} />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 px-0 pb-0 md:p-6 md:pt-0">
            {recent.map((o) => (
              <div key={o.id} className="flex items-center gap-3 rounded-xl bg-white p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{o.customer_name || "Anonymous customer"}</p>
                  <p className="truncate text-xs text-gray-500">{itemsSummary(o)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatMoney(o.total, o.currency)}</p>
                  <p className="text-xs text-gray-500">{timeAgo(o.created_at)}</p>
                </div>
                <OrderStatusBadge status={o.status} />
                <Link href={`/dashboard/orders/${o.id}`}>
                  <Button variant="outline" size="sm">View</Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 bg-white bg-none shadow-none md:border-0 md:bg-gradient-to-br md:from-gray-100 md:to-gray-200">
          <CardHeader className="px-0 pt-0 md:p-6">
            <CardTitle>Top products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-0 pb-0 md:p-6 md:pt-0">
            {top.length === 0 ? (
              <p className="text-sm text-gray-500">No product data yet.</p>
            ) : (
              top.map((p) => (
                <div key={p.name}>
                  <div className="flex justify-between text-sm">
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="text-gray-500">{formatNumber(p.count)} order{p.count === 1 ? "" : "s"}</span>
                  </div>
                  <Progress value={Math.round((p.count / topMax) * 100)} className="mt-1.5" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
