"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Receipt } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  createExpense,
  deleteTransaction,
  getDailyTotals,
  getExpenseSummary,
  listTransactions,
  updateTransaction,
  type DayTotal,
  type TimeRange,
  type Transaction,
} from "../transactions/actions";
import { EXPENSE_CATEGORIES } from "@/lib/transactions/categories";
import { YearHeatmap } from "@/components/dashboard/year-heatmap";

type Summary = {
  thisWeek: number;
  thisMonth: number;
  allTime: number;
  avg: number;
  count: number;
  currency: string;
  byCategory: { category: string; total: number }[];
};

const RANGES: { value: TimeRange; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "all", label: "All" },
];

const CATEGORY_COLORS = [
  "#0866FF",
  "#6EA8FF",
  "#34d399",
  "#fbbf24",
  "#f87171",
  "#a8fe65",
  "#94a3b8",
];

export function ExpensesView({
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
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const currentYear = new Date().getFullYear();
  const years = [0, 1, 2, 3, 4].map((i) => currentYear - i);
  const [dialogOpen, setDialogOpen] = useState(false);
  async function onYearChange(next: number) {
    setYear(next);
    const result = await getDailyTotals({ type: "expense", year: next });
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
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [amount, setAmount] = useState("");
  const [formCategory, setFormCategory] = useState<string>("inventory");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh(next: { range: TimeRange; category: string; search: string }) {
    const [result, dailyResult, summaryResult] = await Promise.all([
      listTransactions({
        type: "expense",
        timeRange: next.range,
        category: next.category === "all" ? undefined : next.category,
        search: next.search || undefined,
      }),
      getDailyTotals({ type: "expense", year }),
      getExpenseSummary(),
    ]);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setRows(result.data);
    if (dailyResult.ok) setDaily(dailyResult.data);
    if (summaryResult.ok) setSummaryState(summaryResult.data);
    router.refresh();
  }

  function openAdd() {
    setEditing(null);
    setAmount("");
    setFormCategory("inventory");
    setDescription("");
    setDate("");
    setDialogOpen(true);
  }

  function openEdit(row: Transaction) {
    setEditing(row);
    setAmount(String(row.amount));
    setFormCategory(row.category ?? "inventory");
    setDescription(row.description ?? "");
    setDate((row.settled_at ?? row.created_at).slice(0, 10));
    setDialogOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result =
      editing == null
        ? await createExpense({
            amount,
            category: formCategory,
            description,
            settled_at: date || undefined,
          })
        : await updateTransaction(editing.id, {
            amount,
            category: formCategory,
            description,
            settled_at: date || undefined,
          });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(editing == null ? "Expense logged" : "Expense updated");
    setDialogOpen(false);
    await refresh({ range, category, search });
  }

  async function onDelete(id: string) {
    const result = await deleteTransaction(id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Expense deleted");
    await refresh({ range, category, search });
  }

  const money = (n: number) => formatCurrency(n, currency);
  const catMax = Math.max(1, ...summaryState.byCategory.map((c) => c.total));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Track your costs to see real profit."
        action={
          <Button onClick={openAdd}>
            <Plus size={16} /> Log expense
          </Button>
        }
      />

      <SummaryStrip
        items={[
          { label: "Last 30 days", value: money(summaryState.thisMonth) },
          { label: "This week", value: money(summaryState.thisWeek) },
          { label: "Total (all time)", value: money(summaryState.allTime) },
          { label: "Avg expense", value: money(summaryState.avg) },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>By category (90 days)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {summaryState.byCategory.length === 0 ? (
            <p className="text-sm text-gray-500">No categorized spending yet.</p>
          ) : (
            summaryState.byCategory.map((c, i) => (
              <div key={c.category}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium capitalize">{c.category}</span>
                  <span className="text-gray-500">{money(c.total)}</span>
                </div>
                <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round((c.total / catMax) * 100)}%`,
                      backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <YearHeatmap
            daily={daily}
            year={year}
            years={years}
            onYearChange={onYearChange}
            selected={selectedDay}
            onSelect={setSelectedDay}
            color="red"
            currency={currency}
            noun="expenses"
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
              onClick={() => {
                setRange(r.value);
                void refresh({ range: r.value, category, search });
              }}
            >
              {r.label}
            </Button>
          ))}
        </div>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            void refresh({ range, category: e.target.value, search });
          }}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Input
          placeholder="Search description…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            void refresh({ range, category, search: e.target.value });
          }}
          className="max-w-xs"
        />
      </div>

      {visibleRows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses logged yet"
          description="Track your costs to see your real profit."
          action={
            <Button onClick={openAdd}>
              <Plus size={16} /> Log your first expense
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
                      {r.description || r.category || "Expense"}
                    </p>
                    <p className="text-xs text-gray-500">{timeAgo(r.settled_at ?? r.created_at)}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium capitalize text-gray-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {r.category ?? "other"}
                  </span>
                  <p className="shrink-0 text-sm font-semibold text-red-600 dark:text-red-400">
                    {money(Number(r.amount))}
                  </p>
                  <Button size="sm" variant="outline" onClick={() => openEdit(r)} aria-label={`Edit ${r.description ?? "expense"}`}>
                    Edit
                  </Button>
                  <button
                    onClick={() => onDelete(r.id)}
                    aria-label="Delete expense"
                    className="shrink-0 rounded px-2 py-1 text-xs text-red-600 hover:bg-gray-50 dark:hover:bg-zinc-800"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing == null ? "Log expense" : "Edit expense"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
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
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              aria-label="Category"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <textarea
              required
              rows={3}
              maxLength={1000}
              placeholder="What was this for? (required for expenses)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border-0 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#a8fe65] dark:bg-zinc-800 dark:focus:bg-zinc-900"
            />
            <Input
              type="date"
              value={date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Expense date (defaults to today)"
            />
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : editing == null ? "Log expense" : "Save changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
