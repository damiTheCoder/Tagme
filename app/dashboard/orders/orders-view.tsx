"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/dashboard/empty-state";
import { OrderStatusBadge } from "@/components/dashboard/order-status-badge";
import { WhatsAppLink } from "@/components/dashboard/whatsapp-link";
import { Inbox } from "lucide-react";
import { OrderActions } from "./order-actions";
import { OrderCalendar, orderDayKey } from "./order-calendar";
import type { Order, OrderFilter } from "./actions";

function formatTotal(order: Order) {
  return formatCurrency(order.total, order.currency);
}

function itemsSummary(order: Order) {
  const names = order.items
    .map((i) => (i?.name ? `${i.name} × ${i.quantity ?? 1}` : null))
    .filter(Boolean) as string[];
  if (names.length === 0) return "No items";
  const first = names.slice(0, 3).join(", ");
  return names.length > 3 ? `${first} +${names.length - 3} more` : first;
}

export function OrdersView({ orders, filter }: { orders: Order[]; filter: OrderFilter }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Reset the calendar selection when switching status tabs.
  useEffect(() => {
    setSelectedDate(null);
  }, [filter]);

  const q = query.trim().toLowerCase();
  const visible = orders.filter((o) => {
    if (selectedDate && orderDayKey(new Date(o.created_at)) !== selectedDate) return false;
    if (!q) return true;
    return (
      (o.customer_name ?? "").toLowerCase().includes(q) ||
      (o.customer_phone ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(v) => router.push(`/dashboard/orders?filter=${v}`)}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="declined">Declined</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input placeholder="Search name or phone…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
      </div>

      <OrderCalendar
        dates={orders.map((o) => o.created_at)}
        selected={selectedDate}
        onSelect={setSelectedDate}
      />

      {visible.length === 0 ? (
        selectedDate ? (
          <EmptyState
            icon={Inbox}
            title="No orders on this date"
            description="Try another day, or clear the selected date to see all orders."
            action={
              <Button variant="outline" size="sm" onClick={() => setSelectedDate(null)}>
                Clear date
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Inbox}
            title={q ? "No matching orders" : filter === "all" ? "No orders yet" : `No ${filter} orders`}
            description={q ? "Try a different search term." : "New orders appear here when customers order from your chat link."}
          />
        )
      ) : (
        <div className="grid gap-3">
          {visible.map((order) => (
            <Card key={order.id} className="transition-colors hover:bg-gray-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{order.customer_name || "Anonymous customer"}</p>
                    {order.customer_phone && (
                      <div className="mt-0.5">
                        <WhatsAppLink phone={order.customer_phone} name={order.customer_phone} />
                      </div>
                    )}
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>
                <p className="mt-1 text-sm text-gray-500">{itemsSummary(order)}</p>
                <div className="mt-1 flex justify-between text-sm">
                  <span className="font-medium">{formatTotal(order)}</span>
                  <span className="text-gray-500">{timeAgo(order.created_at)}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link href={`/dashboard/orders/${order.id}`} className="self-center text-sm text-gray-500 underline hover:text-[#3d7a0a]">
                    View chat
                  </Link>
                  {order.status === "pending" && <OrderActions orderId={order.id} />}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
