"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Banknote, Plus, Receipt } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { SummaryStrip } from "@/components/dashboard/summary-strip";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createManualIncome,
  deleteTransaction,
  getDailyTotals,
  getRevenueSummary,
  listTransactions,
  type DayTotal,
  type TimeRange,
  type Transaction,
} from "../transactions/actions";
import { INCOME_CATEGORIES } from "@/lib/transactions/categories";
import { YearHeatmap } from "@/components/dashboard/year-heatmap";

type Summary = {
  thisWeek: number;
  thisMonth: number;
  allTime: number;
  avg: number;
  count: number;
  currency: string;
};

const RANGES: { value: TimeRange; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "all", label: "All" },
];

function downloadCsv(rows: Transaction[]) {
  const header = "date,description,source,amount,currency,status,reference";
  const lines = rows.map((r) =>
    [
      r.settled_at ?? r.created_at,
      `"${(r.description ?? "Sale").replace(/"/g, '""')}"`,
      r.source,
      r.amount,
      r.currency,
      r.status,
      r.reference ?? "",
    ].join(",")
  );
  const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "revenue.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

export function RevenueView({
  initial,
  summary,
  currency,
  initialDaily,
  initialYear,
}: {
  initial: Transaction[];
  summary: Summary;
  currency: string;
  initialDaily: DayTotal[];
  initialYear: number;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [summaryState, setSummaryState] = useState(summary);
  const [daily, setDaily] = useState<DayTotal[]>(initialDaily);
  const [year, setYear] = useState(initialYear);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [range, setRange] = useState<TimeRange>("all");
  const [source, setSource] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const currentYear = new Date().getFullYear();
  const years = [0, 1, 2, 3, 4].map((i) => currentYear - i);
  const [dialogOpen, setDialogOpen] = useState(false);
  async function onYearChange(next: number) {
    setYear(next);
    const result = await getDailyTotals({ type: "income", year: next });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setDaily(result.data);
    setSelectedDay(null);
  }

  const visibleRows =
    selectedDay == null
      ? rows
      : rows.filter((r) => (r.settled_at ?? r.created_at).slice(0, 10) === selectedDay);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("sales");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh(next: {
    range: TimeRange;
    source: string;
    search: string;
  }) {
    setLoading(true);
    const [result, dailyResult, summaryResult] = await Promise.all([
      listTransactions({
        type: "income",
        timeRange: next.range,
        search: next.search || undefined,
      }),
      getDailyTotals({ type: "income", year }),
      getRevenueSummary(),
    ]);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setRows(
      next.source === "all"
        ? result.data
        : result.data.filter((r) => r.source === next.source)
    );
    if (dailyResult.ok) setDaily(dailyResult.data);
    if (summaryResult.ok) setSummaryState(summaryResult.data);
    router.refresh();
  }

  function onRange(v: TimeRange) {
    setRange(v);
    void refresh({ range: v, source, search });
  }

  function onSource(v: string) {
    setSource(v);
    void refresh({ range, source: v, search });
  }

  function onSearch(v: string) {
    setSearch(v);
    void refresh({ range, source, search: v });
  }

  async function onSaveCashSale(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await createManualIncome({
      amount,
      category,
      description,
      settled_at: date || undefined,
    });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Cash sale logged");
    setDialogOpen(false);
    setAmount("");
    setDescription("");
    setDate("");
    setCategory("sales");
    await refresh({ range, source, search });
  }

  async function onDelete(id: string) {
    const result = await deleteTransaction(id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Entry deleted");
    await refresh({ range, source, search });
  }

  const money = (n: number) => formatCurrency(n, currency);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue"
        description="Every sale, recorded automatically."
        action={
          <>
            <Button variant="outline" onClick={() => downloadCsv(rows)}>
              Export CSV
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus size={16} /> Log cash sale
            </Button>
          </>
        }
      />

      <SummaryStrip
        items={[
          { label: "Last 30 days", value: money(summaryState.thisMonth) },
          { label: "This week", value: money(summaryState.thisWeek) },
          { label: "Total (all time)", value: money(summaryState.allTime) },
          { label: "Avg order value", value: money(summaryState.avg) },
        ]}
      />

      <Card>
        <CardContent className="pt-6">
          <YearHeatmap
            daily={daily}
            year={year}
            years={years}
            onYearChange={onYearChange}
            selected={selectedDay}
            onSelect={setSelectedDay}
            color="blue"
            currency={currency}
            noun="revenue"
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          {RANGES.map((r) => (
            <Button
              key={r.value}
              size="sm"
              variant={range === r.value ? "default" : "outline"}
              onClick={() => onRange(r.value)}
            >
              {r.label}
            </Button>
          ))}
        </div>
        <select
          value={source}
          onChange={(e) => onSource(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          aria-label="Filter by source"
        >
          <option value="all">All sources</option>
          <option value="checkout">Checkout</option>
          <option value="manual_log">Manual log</option>
        </select>
        <Input
          placeholder="Search description or reference…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {visibleRows.length === 0 ? (
        <EmptyState
          icon={Banknote}
          title="No revenue yet"
          description="Share your link to start selling."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus size={16} /> Log your first cash sale
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="flex flex-col">
              {visibleRows.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-0 dark:border-zinc-800"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {r.description || "Sale via checkout"}
                    </p>
                    <p className="text-xs text-gray-500">{timeAgo(r.settled_at ?? r.created_at)}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      r.source === "checkout"
                        ? "bg-[#0866FF20] text-[#0866FF] dark:text-[#7dd3fc]"
                        : "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {r.source === "checkout" ? "Checkout" : "Manual"}
                  </span>
                  <p className="shrink-0 text-sm font-semibold text-green-700 dark:text-green-400">
                    {money(Number(r.amount))}
                  </p>
                  <span
                    className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline ${
                      r.status === "settled"
                        ? "bg-green-100 text-green-700"
                        : r.status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {r.status}
                  </span>
                  {r.reference && (
                    <Link
                      href={`/dashboard/orders/${r.reference}`}
                      className="shrink-0 text-xs font-medium underline"
                    >
                      View order
                    </Link>
                  )}
                  {r.source !== "checkout" && !loading && (
                    <button
                      onClick={() => onDelete(r.id)}
                      aria-label="Delete entry"
                      className="shrink-0 rounded px-2 py-1 text-xs text-red-600 hover:bg-gray-50 dark:hover:bg-zinc-800"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log cash sale</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSaveCashSale} className="flex flex-col gap-3">
            <Input
              required
              type="number"
              min="0"
              step="0.01"
              placeholder={`Amount (${currency})`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              aria-label="Category"
            >
              {INCOME_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <textarea
              rows={3}
              maxLength={1000}
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border-0 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#7dd3fc] dark:bg-zinc-800 dark:focus:bg-zinc-900"
            />
            <Input
              type="date"
              value={date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Sale date (defaults to today)"
            />
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Log sale"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
