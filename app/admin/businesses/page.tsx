import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { timeAgo } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

const DAY = 24 * 3600 * 1000;
const PER_PAGE = 25;

type Filter = "all" | "active" | "dormant" | "empty";

function hrefWith(
  base: string,
  params: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...params, ...overrides })) {
    if (v != null && v !== "") sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await getAdminUser();
  if (!admin) notFound();
  const supabase = createAdminClient();

  const sp = await searchParams;
  const str = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : (v ?? "");
  const q = str(sp.q).trim().toLowerCase();
  const filter = (["all", "active", "dormant", "empty"] as const).includes(
    str(sp.filter) as Filter
  )
    ? (str(sp.filter) as Filter)
    : "all";
  const sort = ["created", "name", "gmv"].includes(str(sp.sort))
    ? str(sp.sort)
    : "created";
  const dir = str(sp.dir) === "asc" ? "asc" : "desc";
  const page = Math.max(1, parseInt(str(sp.page) || "1", 10) || 1);
  const baseParams = {
    q: q || undefined,
    filter: filter === "all" ? undefined : filter,
    sort: sort === "created" ? undefined : sort,
    dir: dir === "desc" ? undefined : dir,
  };

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name, slug, owner_id, created_at, suspended_at, deleted_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  const now = Date.now();
  const since30 = new Date(now - 30 * DAY).toISOString();
  const [{ data: settled30 }, { data: allTxns }] = await Promise.all([
    supabase
      .from("transactions")
      .select("business_id")
      .eq("status", "settled")
      .gte("settled_at", since30)
      .limit(5000),
    supabase
      .from("transactions")
      .select("business_id, type, amount, status, settled_at, created_at")
      .limit(5000),
  ]);

  const activeIds = new Set((settled30 ?? []).map((t) => t.business_id));
  const everIds = new Set((allTxns ?? []).map((t) => t.business_id));
  const gmvByBiz = new Map<string, number>();
  const countByBiz = new Map<string, number>();
  const lastByBiz = new Map<string, number>();
  for (const t of allTxns ?? []) {
    const amt = Number(t.amount) || 0;
    if (t.type === "income" && t.status === "settled") {
      gmvByBiz.set(t.business_id, (gmvByBiz.get(t.business_id) ?? 0) + amt);
    }
    countByBiz.set(t.business_id, (countByBiz.get(t.business_id) ?? 0) + 1);
    const ts = new Date(t.settled_at ?? t.created_at).getTime();
    lastByBiz.set(t.business_id, Math.max(lastByBiz.get(t.business_id) ?? 0, ts));
  }

  const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailByUserId = new Map(
    (usersData?.users ?? []).filter((u) => u.email).map((u) => [u.id, u.email as string])
  );

  let rows = (businesses ?? []).filter((b) => {
    if (q) {
      const hay = `${b.name} ${b.slug} ${emailByUserId.get(b.owner_id) ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filter === "active") return activeIds.has(b.id);
    if (filter === "dormant") return everIds.has(b.id) && !activeIds.has(b.id);
    if (filter === "empty") return !everIds.has(b.id);
    return true;
  });

  rows = [...rows].sort((a, b) => {
    let cmp = 0;
    if (sort === "name") cmp = a.name.localeCompare(b.name);
    else if (sort === "gmv")
      cmp = (gmvByBiz.get(a.id) ?? 0) - (gmvByBiz.get(b.id) ?? 0);
    else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return dir === "asc" ? cmp : -cmp;
  });

  const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  // Per-business product/order counts for the visible page only.
  const prodCounts = new Map<string, number>();
  const orderCounts = new Map<string, number>();
  await Promise.all(
    pageRows.map(async (b) => {
      const [{ count: pc }, { count: oc }] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("business_id", b.id),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("business_id", b.id),
      ]);
      prodCounts.set(b.id, pc ?? 0);
      orderCounts.set(b.id, oc ?? 0);
    })
  );

  const sortLink = (key: string, label: string) => {
    const nextDir = sort === key && dir === "desc" ? "asc" : "desc";
    return (
      <Link
        href={hrefWith("/admin/businesses", baseParams, { sort: key, dir: nextDir, page: undefined })}
        className="underline"
      >
        {label}
        {sort === key ? (dir === "desc" ? " ↓" : " ↑") : ""}
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Businesses</h1>
        <p className="text-sm text-gray-500">
          {rows.length} business{rows.length === 1 ? "" : "es"}
        </p>
      </div>

      <form action="/admin/businesses" method="GET" className="flex gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search name, slug, owner email…"
          className="max-w-sm bg-white"
        />
        {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      <div className="flex gap-1.5">
        {(["all", "active", "dormant", "empty"] as const).map((f) => (
          <Link
            key={f}
            href={hrefWith("/admin/businesses", baseParams, { filter: f === "all" ? undefined : f, page: undefined })}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium capitalize",
              filter === f
                ? "bg-zinc-900 text-white"
                : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
            )}
          >
            {f}
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{sortLink("name", "Business")}</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>{sortLink("created", "Created")}</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Txns</TableHead>
                <TableHead>{sortLink("gmv", "Settled GMV")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <Link href={`/admin/businesses/${b.id}`} className="font-medium underline">
                      {b.name}
                    </Link>
                    {(b.suspended_at || b.deleted_at) && (
                      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
                        {b.deleted_at ? "deleted" : "suspended"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{b.slug}</TableCell>
                  <TableCell className="text-xs">
                    {emailByUserId.get(b.owner_id) ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs">{timeAgo(b.created_at)}</TableCell>
                  <TableCell className="text-xs">
                    {lastByBiz.has(b.id)
                      ? timeAgo(new Date(lastByBiz.get(b.id)!).toISOString())
                      : "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">{prodCounts.get(b.id) ?? 0}</TableCell>
                  <TableCell className="tabular-nums">{orderCounts.get(b.id) ?? 0}</TableCell>
                  <TableCell className="tabular-nums">{countByBiz.get(b.id) ?? 0}</TableCell>
                  <TableCell className="font-medium tabular-nums">
                    {formatCurrency(Math.round(gmvByBiz.get(b.id) ?? 0), "NGN")}
                  </TableCell>
                </TableRow>
              ))}
              {pageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-sm text-gray-500">
                    No businesses match.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center gap-3 text-sm">
          {safePage > 1 && (
            <Link
              href={hrefWith("/admin/businesses", baseParams, { page: String(safePage - 1) })}
              className="underline"
            >
              ← Prev
            </Link>
          )}
          <span className="text-gray-500">
            Page {safePage} of {totalPages}
          </span>
          {safePage < totalPages && (
            <Link
              href={hrefWith("/admin/businesses", baseParams, { page: String(safePage + 1) })}
              className="underline"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
