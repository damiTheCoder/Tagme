import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { timeAgo } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OverviewCharts, type AdminDayPoint } from "./overview-charts";

const DAY = 24 * 3600 * 1000;

function dayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export default async function AdminOverviewPage() {
  const admin = await getAdminUser();
  if (!admin) notFound();
  const supabase = createAdminClient();
  const now = Date.now();
  const since30 = new Date(now - 30 * DAY).toISOString();
  const since7 = new Date(now - 7 * DAY).toISOString();

  const [{ count: businessCount }, { data: biz30 }, { data: recentBiz }, { data: allOwners }] =
    await Promise.all([
      supabase.from("businesses").select("id", { count: "exact", head: true }),
      supabase
        .from("businesses")
        .select("id, created_at")
        .gte("created_at", since30)
        .limit(2000),
      supabase
        .from("businesses")
        .select("id, name, slug, owner_id, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase.from("businesses").select("owner_id").limit(10000),
    ]);

  const [{ data: settled30 }, { data: settledAll }, { data: recentTxns }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("business_id, amount, type, settled_at")
        .eq("status", "settled")
        .gte("settled_at", since30)
        .limit(5000),
      supabase
        .from("transactions")
        .select("amount")
        .eq("status", "settled")
        .eq("type", "income")
        .limit(10000),
      supabase
        .from("transactions")
        .select("id, business_id, type, amount, currency, status, settled_at, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  // Owner emails via the Auth API (service role).
  const ownerIds = [...new Set((recentBiz ?? []).map((b) => b.owner_id))];
  const emailByUserId = new Map<string, string>();
  if (ownerIds.length > 0) {
    const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    for (const u of data?.users ?? []) {
      if (u.email) emailByUserId.set(u.id, u.email);
    }
  }

  const activeBusinessIds = new Set(
    (settled30 ?? []).map((t) => t.business_id)
  );
  const gmv = (settledAll ?? []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const signupsWeek = (biz30 ?? []).filter(
    (b) => new Date(b.created_at).getTime() >= now - 7 * DAY
  ).length;
  const txnsWeek = (settled30 ?? []).filter(
    (t) => t.settled_at && new Date(t.settled_at).getTime() >= now - 7 * DAY
  ).length;

  const daily: AdminDayPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * DAY);
    const key = dayKey(d);
    daily.push({
      date: key,
      signups: (biz30 ?? []).filter(
        (b) => String(b.created_at).slice(0, 10) === key
      ).length,
      gmv: Math.round(
        (settled30 ?? [])
          .filter(
            (t) =>
              t.type === "income" &&
              t.settled_at &&
              String(t.settled_at).slice(0, 10) === key
          )
          .reduce((s, t) => s + (Number(t.amount) || 0), 0)
      ),
    });
  }

  const bizNameById = new Map(
    (recentBiz ?? []).map((b) => [b.id, b.name] as const)
  );
  // Business names for recent transactions (may include older businesses).
  const txnBizIds = [...new Set((recentTxns ?? []).map((t) => t.business_id))];
  const missingBizIds = txnBizIds.filter((id) => !bizNameById.has(id));
  if (missingBizIds.length > 0) {
    const { data: extra } = await supabase
      .from("businesses")
      .select("id, name")
      .in("id", missingBizIds);
    for (const b of extra ?? []) bizNameById.set(b.id, b.name);
  }

  const stats = [
    { label: "Total businesses", value: String(businessCount ?? 0) },
    { label: "Active businesses", value: String(activeBusinessIds.size) },
    {
      label: "Total users",
      value: String(new Set((allOwners ?? []).map((b) => b.owner_id)).size),
    },
    { label: "Total GMV", value: formatCurrency(Math.round(gmv), "NGN") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Overview</h1>
        <p className="text-sm text-gray-500">Platform activity at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Signups this week</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{signupsWeek}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Transactions this week</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{txnsWeek}</p>
          </CardContent>
        </Card>
      </div>

      <OverviewCharts daily={daily} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent businesses</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(recentBiz ?? []).map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <Link
                        href={`/admin/businesses/${b.id}`}
                        className="font-medium underline"
                      >
                        {b.name}
                      </Link>
                      <p className="text-xs text-gray-500">{b.slug}</p>
                    </TableCell>
                    <TableCell className="text-xs">
                      {emailByUserId.get(b.owner_id) ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">{timeAgo(b.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent transactions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(recentTxns ?? []).map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs">
                      {bizNameById.get(t.business_id) ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {t.type} · {t.status}
                    </TableCell>
                    <TableCell className="text-xs font-medium tabular-nums">
                      {formatCurrency(Number(t.amount), t.currency ?? "NGN")}
                    </TableCell>
                    <TableCell className="text-xs">
                      {timeAgo(t.settled_at ?? t.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
