import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { timeAgo } from "@/lib/utils";
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
  return qs ? `/admin/audit?${qs}` : "/admin/audit";
}

export default async function AdminAuditPage({
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
  const action = str(sp.action).trim();
  const targetType = str(sp.target_type).trim();
  const from = str(sp.from);
  const to = str(sp.to);
  const page = Math.max(1, parseInt(str(sp.page) || "1", 10) || 1);
  const baseParams = {
    action: action || undefined,
    target_type: targetType || undefined,
    from: from || undefined,
    to: to || undefined,
  };

  let query = supabase
    .from("admin_audit_log")
    .select("id, admin_user_id, action, target_type, target_id, metadata, ip_address, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (action) query = query.eq("action", action);
  if (targetType) query = query.eq("target_type", targetType);
  if (from) query = query.gte("created_at", new Date(from).toISOString());
  if (to) query = query.lte("created_at", new Date(to + "T23:59:59").toISOString());
  const { data: logs } = await query;

  const adminIds = [...new Set((logs ?? []).map((l) => l.admin_user_id))];
  const emailById = new Map<string, string>();
  if (adminIds.length > 0) {
    const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    for (const u of data?.users ?? []) {
      if (adminIds.includes(u.id) && u.email) emailById.set(u.id, u.email);
    }
  }

  // Distinct values for filter dropdowns.
  const { data: distinct } = await supabase
    .from("admin_audit_log")
    .select("action, target_type")
    .limit(500);
  const actionOptions = [...new Set((distinct ?? []).map((d) => d.action).filter(Boolean))];
  const targetOptions = [
    ...new Set((distinct ?? []).map((d) => d.target_type).filter(Boolean)),
  ];

  const rows = logs ?? [];
  const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Audit Log</h1>
        <p className="text-sm text-gray-500">
          {rows.length} entr{rows.length === 1 ? "y" : "ies"} · read-only
        </p>
      </div>

      <form action="/admin/audit" method="GET" className="flex flex-wrap items-end gap-2">
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          Action
          <select
            name="action"
            defaultValue={action}
            className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm text-zinc-900"
          >
            <option value="">All</option>
            {actionOptions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          Target
          <select
            name="target_type"
            defaultValue={targetType}
            className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm text-zinc-900"
          >
            <option value="">All</option>
            {targetOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
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
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Metadata</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">
                    {emailById.get(l.admin_user_id) ?? l.admin_user_id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{l.action}</TableCell>
                  <TableCell className="text-xs">
                    {l.target_type ?? "—"}
                    {l.target_id && l.target_type === "business" ? (
                      <>
                        {" "}
                        <Link
                          href={`/admin/businesses/${l.target_id}`}
                          className="font-mono underline"
                        >
                          {String(l.target_id).slice(0, 8)}
                        </Link>
                      </>
                    ) : (
                      l.target_id ? ` ${String(l.target_id).slice(0, 8)}` : ""
                    )}
                  </TableCell>
                  <TableCell className="max-w-[280px] text-xs">
                    {l.metadata ? (
                      <details>
                        <summary className="cursor-pointer underline">view</summary>
                        <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-50 p-2 font-mono text-[11px]">
                          {JSON.stringify(l.metadata, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{timeAgo(l.created_at)}</TableCell>
                </TableRow>
              ))}
              {pageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-gray-500">
                    No audit entries yet.
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
              href={hrefWith(baseParams, { page: String(safePage - 1) })}
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
              href={hrefWith(baseParams, { page: String(safePage + 1) })}
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
