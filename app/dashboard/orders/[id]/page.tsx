import Link from "next/link";
import { ChevronLeft, MessageCircle } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, getCurrentBusiness } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { OrderStatusBadge } from "@/components/dashboard/order-status-badge";
import { WhatsAppLink } from "@/components/dashboard/whatsapp-link";
import { OrderActions } from "../order-actions";
import { OrderNote } from "../order-note";

function formatTotal(total: number, currency: string) {
  return formatCurrency(total, currency);
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getCurrentBusiness();
  if (!business) redirect("/onboarding");

  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, total, currency, status, items, conversation_id, owner_note, created_at, customers ( name, phone )")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!order) notFound();

  const customer = order.customers as
    | { name: string | null; phone: string | null }
    | { name: string | null; phone: string | null }[]
    | null;
  const firstCustomer = Array.isArray(customer) ? customer[0] : customer;
  const customerName = firstCustomer?.name ?? null;
  const customerPhone = firstCustomer?.phone ?? null;

  const items = Array.isArray(order.items) ? order.items : [];

  let messages: { id: string; role: string; content: string }[] = [];
  if (order.conversation_id) {
    const { data } = await supabase
      .from("messages")
      .select("id, role, content")
      .eq("conversation_id", order.conversation_id)
      .order("created_at", { ascending: true })
      .limit(500);
    messages = data ?? [];
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/orders" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#3d7a0a]">
        <ChevronLeft size={16} /> Back to orders
      </Link>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Conversation thread — 2/3 */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Conversation</CardTitle>
            <OrderStatusBadge status={order.status} />
          </CardHeader>
          <CardContent>
            {messages.length === 0 ? (
              <div className="rounded-xl bg-white p-12 text-center text-gray-500">
                <p className="text-sm">No messages in this conversation.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {messages.map((m) =>
                  m.role === "system" ? (
                    <p key={m.id} className="self-center rounded-full bg-gray-50 px-3 py-1 text-center text-xs text-zinc-500">
                      {m.content}
                    </p>
                  ) : (
                    <div
                      key={m.id}
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        m.role === "user" ? "self-end bg-[#a8fe65] text-[#1a1a1a]" : "self-start bg-white text-zinc-900"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    </div>
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order summary — 1/3 */}
        <Card className="h-fit lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{customerName || "Anonymous customer"}</p>
                {customerPhone && (
                  <div className="mt-0.5">
                    <WhatsAppLink phone={customerPhone} name={customerPhone} />
                  </div>
                )}
              </div>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="text-sm text-gray-500">{timeAgo(order.created_at)}</p>
            <Separator />
            <div className="space-y-1.5 text-sm">
              {items.map((item: { name?: string; quantity?: number; unit_price?: number }, i: number) => (
                <div key={i} className="flex justify-between gap-2">
                  <span>
                    {item?.name || "Item"} × {item?.quantity ?? 1}
                  </span>
                  <span className="text-gray-500">
                    {item?.unit_price != null
                      ? formatTotal(Number(item.unit_price) * Number(item.quantity ?? 1), order.currency)
                      : ""}
                  </span>
                </div>
              ))}
            </div>
            <Separator />
            <p className="text-right font-medium">Total: {formatTotal(order.total, order.currency)}</p>
            <OrderNote orderId={order.id} initialNote={order.owner_note} />
            {order.status === "pending" && (
              <div className="flex flex-wrap gap-2">
                <OrderActions orderId={order.id} />
              </div>
            )}
            {customerPhone && (
              <a
                href={`https://wa.me/${customerPhone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
              >
                <Button className="w-full">
                  <MessageCircle size={16} /> Message on WhatsApp
                </Button>
              </a>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
