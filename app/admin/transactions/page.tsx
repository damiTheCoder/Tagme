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
import { ExportCsvButton } from "./export-csv-button";

const PER_PAGE = 50;

function hrefWith(
  params: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...params, ...overrides })) {
    if (v != null && v !== "") sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `/admin/transactions?${qs}` : "/admin/transactions";
}

function FilterSelect({
  name,
  value,
  options,
  label,
}: {
  name: string;
  value: string;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-gray-500">
      {label}
      <select
        name={name}
        defaultValue={value}
        className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm text-zinc-900"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default async function AdminTransactionsPage({
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
  const q = str(sp.q).trim();
  const type = str(sp.type) || "all";
  const status = str(sp.status) || "all";
  const source = str(sp.source) || "all";
  const from = str(sp.from);
  const to = str(sp.to);
  const page = Math.max(1, parseInt(str(sp.page) || "1", 10) || 1);
  const baseParams = {
    q: q || undefined,
    type: type === "all" ? undefined : type,
    status: status === "all" ? undefined : status,
    source: source === "all" ? undefined : source,
    from: from || undefined,
    to: to || undefined,
  };

  let query = supabase
    .from("transactions")
    .select("id, business_id, type, amount, currency, status, source, description, settled_at, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (type !== "all") query = query.eq("type", type);
  if (status !== "all") query = query.eq("status", status);
  if (source !== "all") query = query.eq("source", source);
  if (from) query = query.gte("created_at", new Date(from).toISOString());
  if (to) query = query.lte("created_at", new Date(to + "T23:59:59").toISOString());
  // Text matching happens in JS below so business names match too.
  const { data: txns } = await query;

  const bizIds = [...new Set((txns ?? []).map((t) => t.business_id))];
  const bizNameById = new Map<string, string>();
  const bizCache = new Map<string, string>();
  // Names for the business filter dropdown (recent businesses).
  const { data: allBiz } = await supabase
    .from("businesses")
    .select("id, name")
    .order("created_at", { ascending: false })
    .limit(200);
  for (const b of allBiz ?? []) bizCache.set(b.id, b.name);
  const missing = bizIds.filter((id) => !bizCache.has(id));
  if (missing.length > 0) {
    const { data: extra } = await supabase
      .from("businesses")
      .select("id, name")
      .in("id", missing);
    for (const b of extra ?? []) bizCache.set(b.id, b.name);
  }
  for (const [k, v] of bizCache) bizNameById.set(k, v);

  let rows = txns ?? [];
  const bizFilter = str(sp.business);
  const qLower = q.toLowerCase();
  const filtered = rows.filter((t) => {
    if (bizFilter && t.business_id !== bizFilter) return false;
    if (qLower) {
      const name = (bizNameById.get(t.business_id) ?? "").toLowerCase();
      if (
        !(t.description ?? "").toLowerCase().includes(qLower) &&
        !name.includes(qLower)
      )
        return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Transactions</h1>
          <p className="text-sm text-gray-500">
            {filtered.length} result{filtered.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="ml-auto">
          <ExportCsvButton rows={filtered as unknown as Record<string, unknown>[]} />
        </div>
      </div>

      <form action="/admin/transactions" method="GET" className="flex flex-wrap items-end gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search description or business…"
          className="max-w-xs bg-white"
        />
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          Business
          <select
            name="business"
            defaultValue={bizFilter}
            className="h-9 max-w-[200px] rounded-lg border border-gray-200 bg-white px-2 text-sm text-zinc-900"
          >
            <option value="">All</option>
            {(allBiz ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <FilterSelect
          name="type"
          value={type}
          label="Type"
          options={[
            { value: "all", label: "All" },
            { value: "income", label: "Income" },
            { value: "expense", label: "Expense" },
          ]}
        />
        <FilterSelect
          name="status"
          value={status}
          label="Status"
          options={[
            { value: "all", label: "All" },
            { value: "settled", label: "Settled" },
            { value: "pending", label: "Pending" },
            { value: "failed", label: "Failed" },
            { value: "refunded", label: "Refunded" },
          ]}
        />
        <FilterSelect
          name="source"
          value={source}
          label="Source"
          options={[
            { value: "all", label: "All" },
            { value: "checkout", label: "Checkout" },
            { value: "manual_log", label: "Manual log" },
            { value: "manual_expense", label: "Manual expense" },
          ]}
        />
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          From
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          To
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm"
          />
        </label>
        <Button type="submit" variant="outline">
          Apply
        </Button>
      </form>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Settled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-xs">
                    <Link href={`/admin/businesses/${t.business_id}`} className="underline">
                      {bizNameById.get(t.business_id) ?? t.business_id.slice(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        t.type === "income"
                          ? "rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700"
                          : "rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700"
                      }
                    >
                      {t.type}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium tabular-nums">
                    {formatCurrency(Number(t.amount), t.currency ?? "NGN")}
                  </TableCell>
                  <TableCell className="text-xs">{t.status}</TableCell>
                  <TableCell className="text-xs">{t.source}</TableCell>
                  <TableCell className="max-w-[220px] truncate text-xs">
                    {t.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {t.settled_at ? timeAgo(t.settled_at) : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {pageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-gray-500">
                    No transactions match.
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
              href={hrefWith({ ...baseParams, business: bizFilter || undefined }, { page: String(safePage - 1) })}
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
              href={hrefWith({ ...baseParams, business: bizFilter || undefined }, { page: String(safePage + 1) })}
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
