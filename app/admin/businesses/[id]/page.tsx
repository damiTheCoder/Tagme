import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCreditScore } from "@/app/dashboard/credit-score/actions";
import { timeAgo } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  impersonateBusiness,
  suspendBusiness,
  unsuspendBusiness,
  softDeleteBusiness,
} from "../../actions";

const TABS = ["products", "orders", "transactions", "conversations"] as const;

export default async function AdminBusinessDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await getAdminUser();
  if (!admin) notFound();
  const { id } = await params;
  const sp = await searchParams;
  const rawTab = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const tab = (TABS as readonly string[]).includes(rawTab ?? "")
    ? (rawTab as (typeof TABS)[number])
    : "products";

  const supabase = createAdminClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, owner_id, created_at, currency, description, suspended_at, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (!business) notFound();

  const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const ownerEmail =
    (usersData?.users ?? []).find((u) => u.id === business.owner_id)?.email ?? "—";

  const [
    { count: productCount },
    { count: orderCount },
    { data: txns },
    { data: products },
    { data: orders },
    { data: conversations },
  ] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("business_id", id),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("business_id", id),
    supabase
      .from("transactions")
      .select("id, type, amount, currency, status, source, description, settled_at, created_at")
      .eq("business_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("products")
      .select("id, name, price, stock_count, in_stock")
      .eq("business_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("orders")
      .select("id, total, currency, status, created_at, customer_id")
      .eq("business_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("conversations")
      .select("id, created_at, customers ( name )")
      .eq("business_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const gmv = (txns ?? [])
    .filter((t) => t.type === "income" && t.status === "settled")
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const orderCustomerIds = [...new Set((orders ?? []).map((o) => o.customer_id).filter(Boolean))];
  const customerNames = new Map<string, string>();
  if (orderCustomerIds.length > 0) {
    const { data: custs } = await supabase
      .from("customers")
      .select("id, name")
      .in("id", orderCustomerIds as string[]);
    for (const c of custs ?? []) customerNames.set(c.id, c.name ?? "—");
  }

  const msgCounts = new Map<string, number>();
  const convIds = (conversations ?? []).map((c) => c.id);
  if (convIds.length > 0) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", convIds)
      .limit(2000);
    for (const m of msgs ?? []) {
      msgCounts.set(m.conversation_id, (msgCounts.get(m.conversation_id) ?? 0) + 1);
    }
  }

  const scoreResult = await getCreditScore({ businessId: id });

  const stats = [
    { label: "Products", value: String(productCount ?? 0) },
    { label: "Orders", value: String(orderCount ?? 0) },
    { label: "Transactions (50)", value: String(txns?.length ?? 0) },
    { label: "GMV (settled)", value: formatCurrency(Math.round(gmv), business.currency ?? "NGN") },
    {
      label: "Credit score",
      value: scoreResult.ok ? `${scoreResult.summary.score} · ${scoreResult.summary.tier}` : "—",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/businesses" className="text-sm text-gray-500 underline">
          ← Businesses
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-zinc-900">{business.name}</h1>
          {(business.suspended_at || business.deleted_at) && (
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
              {business.deleted_at ? "deleted" : "suspended"}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-500">
          /{business.slug} · {ownerEmail} · <span className="font-mono text-xs">{business.owner_id}</span>
        </p>
        <p className="text-xs text-gray-500">
          Created {timeAgo(business.created_at)} · {business.currency}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={`/${business.slug}`} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              View public link
            </Button>
          </a>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-1.5">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/admin/businesses/${id}?tab=${t}`}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium capitalize",
              tab === t
                ? "bg-zinc-900 text-white"
                : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
            )}
          >
            {t}
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {tab === "products" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(products ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="tabular-nums">{p.price}</TableCell>
                    <TableCell>{p.in_stock ? (p.stock_count ?? "yes") : "out"}</TableCell>
                  </TableRow>
                ))}
                {(products ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-sm text-gray-500">
                      No products.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          {tab === "orders" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(orders ?? []).map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="text-xs">
                      {o.customer_id ? (customerNames.get(o.customer_id) ?? o.customer_id.slice(0, 8)) : "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatCurrency(Number(o.total), o.currency ?? business.currency ?? "NGN")}
                    </TableCell>
                    <TableCell className="text-xs">{o.status}</TableCell>
                    <TableCell className="text-xs">{timeAgo(o.created_at)}</TableCell>
                  </TableRow>
                ))}
                {(orders ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-sm text-gray-500">
                      No orders.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          {tab === "transactions" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(txns ?? []).map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs">{t.type}</TableCell>
                    <TableCell className="tabular-nums">
                      {formatCurrency(Number(t.amount), t.currency ?? business.currency ?? "NGN")}
                    </TableCell>
                    <TableCell className="text-xs">{t.status}</TableCell>
                    <TableCell className="text-xs">{t.source}</TableCell>
                    <TableCell className="text-xs">{timeAgo(t.settled_at ?? t.created_at)}</TableCell>
                  </TableRow>
                ))}
                {(txns ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-sm text-gray-500">
                      No transactions.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          {tab === "conversations" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(conversations ?? []).map((c) => {
                  const cust = c.customers as { name: string | null } | { name: string | null }[] | null;
                  const first = Array.isArray(cust) ? cust[0] : cust;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs">{first?.name ?? "—"}</TableCell>
                      <TableCell className="tabular-nums">{msgCounts.get(c.id) ?? 0}</TableCell>
                      <TableCell className="text-xs">{timeAgo(c.created_at)}</TableCell>
                    </TableRow>
                  );
                })}
                {(conversations ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-sm text-gray-500">
                      No conversations.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <form
            action={async () => {
              "use server";
              await impersonateBusiness(id);
            }}
          >
            <Button type="submit" size="sm">
              Impersonate owner
            </Button>
          </form>
          {business.suspended_at ? (
            <form
              action={async () => {
                "use server";
                await unsuspendBusiness(id);
              }}
            >
              <Button type="submit" size="sm" variant="outline">
                Unsuspend
              </Button>
            </form>
          ) : (
            <form
              action={async () => {
                "use server";
                await suspendBusiness(id);
              }}
            >
              <Button type="submit" size="sm" variant="outline">
                Suspend business
              </Button>
            </form>
          )}
          {!business.deleted_at && (
            <form
              action={async () => {
                "use server";
                await softDeleteBusiness(id);
              }}
            >
              <Button type="submit" size="sm" variant="destructive">
                Delete business
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
