"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from "@/lib/transactions/categories";

export type Transaction = {
  id: string;
  business_id: string;
  type: "income" | "expense";
  amount: number;
  currency: string;
  source: string;
  category: string | null;
  description: string | null;
  reference: string | null;
  status: string;
  settled_at: string | null;
  created_at: string;
};

export type TxnResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type TimeRange = "7d" | "30d" | "90d" | "all";

export type DayTotal = { date: string; total: number };

const SELECT =
  "id, business_id, type, amount, currency, source, category, description, reference, status, settled_at, created_at";

function rangeStart(range: TimeRange): string | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
}

function cleanAmount(amount: unknown): number {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (typeof n !== "number" || !Number.isFinite(n))
    throw new Error("Amount must be a number.");
  if (n <= 0) throw new Error("Amount must be more than 0.");
  if (n > 1000000000) throw new Error("Amount is too large.");
  return Math.round(n * 100) / 100;
}

function cleanOptional(value: unknown, max: number, label: string): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new Error(`${label} must be a string.`);
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max)
    throw new Error(`${label} must be at most ${max} characters.`);
  return trimmed;
}

function cleanDate(value: unknown): string {
  if (value == null || value === "") return new Date().toISOString();
  const d = new Date(String(value));
  if (isNaN(d.getTime())) throw new Error("Invalid date.");
  if (d.getTime() > Date.now() + 24 * 3600 * 1000)
    throw new Error("Date cannot be in the future.");
  return d.toISOString();
}

function touch() {
  revalidatePath("/dashboard/revenue");
  revalidatePath("/dashboard/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/credit-score");
}

function isManual(source: string): boolean {
  return source === "manual_log" || source === "manual_expense";
}

export async function listTransactions(opts: {
  type?: "income" | "expense";
  timeRange?: TimeRange;
  category?: string;
  search?: string;
}): Promise<TxnResult<Transaction[]>> {
  try {
    const business = await getCurrentBusiness();
    if (!business) throw new Error("No business found.");

    const supabase = await createClient();
    let query = supabase
      .from("transactions")
      .select(SELECT)
      .eq("business_id", business.id)
      .order("settled_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(500);

    if (opts.type) query = query.eq("type", opts.type);
    const since = rangeStart(opts.timeRange ?? "all");
    if (since) query = query.gte("settled_at", since);
    if (opts.category) query = query.eq("category", opts.category);
    const q = opts.search?.trim();
    if (q) {
      const clean = q.replace(/[%_,()]/g, "").slice(0, 100);
      query = query.or(
        `description.ilike.%${clean}%,reference.ilike.%${clean}%`
      );
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true, data: (data ?? []) as Transaction[] };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to load transactions.",
    };
  }
}

export async function createManualIncome(input: {
  amount: number | string;
  category?: string | null;
  description?: string | null;
  settled_at?: string | null;
}): Promise<TxnResult<Transaction>> {
  try {
    const business = await getCurrentBusiness();
    if (!business) throw new Error("No business found.");
    const category = cleanOptional(input.category, 40, "Category") ?? "sales";
    if (!(INCOME_CATEGORIES as readonly string[]).includes(category))
      throw new Error("Invalid category.");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        business_id: business.id,
        type: "income",
        amount: cleanAmount(input.amount),
        currency: business.currency,
        source: "manual_log",
        category,
        description: cleanOptional(input.description, 1000, "Description"),
        status: "settled",
        settled_at: cleanDate(input.settled_at),
      })
      .select(SELECT)
      .single();

    if (error) throw new Error(error.message);
    touch();
    return { ok: true, data: data as Transaction };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to log sale.",
    };
  }
}

export async function createExpense(input: {
  amount: number | string;
  category?: string | null;
  description?: string | null;
  settled_at?: string | null;
}): Promise<TxnResult<Transaction>> {
  try {
    const business = await getCurrentBusiness();
    if (!business) throw new Error("No business found.");
    const category = cleanOptional(input.category, 40, "Category");
    if (!category || !(EXPENSE_CATEGORIES as readonly string[]).includes(category))
      throw new Error("Pick a valid category.");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        business_id: business.id,
        type: "expense",
        amount: cleanAmount(input.amount),
        currency: business.currency,
        source: "manual_expense",
        category,
        description: cleanOptional(input.description, 1000, "Description"),
        status: "settled",
        settled_at: cleanDate(input.settled_at),
      })
      .select(SELECT)
      .single();

    if (error) throw new Error(error.message);
    touch();
    return { ok: true, data: data as Transaction };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to log expense.",
    };
  }
}

export async function updateTransaction(
  id: string,
  input: {
    amount?: number | string;
    category?: string | null;
    description?: string | null;
    settled_at?: string | null;
  }
): Promise<TxnResult<Transaction>> {
  try {
    const business = await getCurrentBusiness();
    if (!business) throw new Error("No business found.");
    if (!id) throw new Error("Transaction id is required.");

    const supabase = await createClient();
    const { data: existing, error: fetchError } = await supabase
      .from("transactions")
      .select("id, source")
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!existing) throw new Error("Transaction not found.");
    if (!isManual(existing.source))
      throw new Error("Automated transactions cannot be edited.");

    const patch: Record<string, unknown> = {};
    if (input.amount !== undefined) patch.amount = cleanAmount(input.amount);
    if (input.category !== undefined)
      patch.category = cleanOptional(input.category, 40, "Category");
    if (input.description !== undefined)
      patch.description = cleanOptional(input.description, 1000, "Description");
    if (input.settled_at !== undefined) patch.settled_at = cleanDate(input.settled_at);
    if (Object.keys(patch).length === 0) throw new Error("Nothing to update.");

    const { data, error } = await supabase
      .from("transactions")
      .update(patch)
      .eq("id", id)
      .eq("business_id", business.id)
      .select(SELECT)
      .single();

    if (error) throw new Error(error.message);
    touch();
    return { ok: true, data: data as Transaction };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to update transaction.",
    };
  }
}

export async function deleteTransaction(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const business = await getCurrentBusiness();
    if (!business) throw new Error("No business found.");
    if (!id) throw new Error("Transaction id is required.");

    const supabase = await createClient();
    const { data: existing, error: fetchError } = await supabase
      .from("transactions")
      .select("id, source")
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!existing) throw new Error("Transaction not found.");
    if (!isManual(existing.source))
      throw new Error("Automated transactions cannot be deleted.");

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("business_id", business.id);
    if (error) throw new Error(error.message);
    touch();
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to delete transaction.",
    };
  }
}

type Summary = {
  thisWeek: number;
  thisMonth: number;
  allTime: number;
  avg: number;
  count: number;
  currency: string;
};

async function summarize(
  type: "income" | "expense"
): Promise<Summary> {
  const business = await getCurrentBusiness();
  if (!business) throw new Error("No business found.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("amount, settled_at")
    .eq("business_id", business.id)
    .eq("type", type)
    .eq("status", "settled")
    .order("settled_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);

  const now = new Date();
  const weekAgo = now.getTime() - 7 * 24 * 3600 * 1000;
  // Rolling 30 days (not calendar month) so Revenue/Expenses match the
  // credit-score monthly income signal window exactly.
  const monthAgo = now.getTime() - 30 * 24 * 3600 * 1000;
  let thisWeek = 0;
  let thisMonth = 0;
  let allTime = 0;
  for (const r of data ?? []) {
    const amt = Number(r.amount) || 0;
    const t = r.settled_at ? new Date(r.settled_at).getTime() : 0;
    allTime += amt;
    if (t >= weekAgo) thisWeek += amt;
    if (t >= monthAgo) thisMonth += amt;
  }
  const count = data?.length ?? 0;
  return {
    thisWeek: Math.round(thisWeek * 100) / 100,
    thisMonth: Math.round(thisMonth * 100) / 100,
    allTime: Math.round(allTime * 100) / 100,
    avg: count === 0 ? 0 : Math.round((allTime / count) * 100) / 100,
    count,
    currency: business.currency,
  };
}

export async function getRevenueSummary(): Promise<
  TxnResult<Summary>
> {
  try {
    return { ok: true, data: await summarize("income") };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to load summary.",
    };
  }
}

export async function getExpenseSummary(): Promise<
  TxnResult<Summary & { byCategory: { category: string; total: number }[] }>
> {
  try {
    const business = await getCurrentBusiness();
    if (!business) throw new Error("No business found.");
    const supabase = await createClient();
    const now = Date.now();
    const since =
      now - 90 * 24 * 3600 * 1000 > 0
        ? new Date(now - 90 * 24 * 3600 * 1000).toISOString()
        : null;
    let query = supabase
      .from("transactions")
      .select("amount, category")
      .eq("business_id", business.id)
      .eq("type", "expense")
      .eq("status", "settled")
      .limit(2000);
    if (since) query = query.gte("settled_at", since);
    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const byCategory = new Map<string, number>();
    for (const r of data ?? []) {
      const cat = r.category || "other";
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + (Number(r.amount) || 0));
    }
    const summary = await summarize("expense");
    return {
      ok: true,
      data: {
        ...summary,
        byCategory: [...byCategory.entries()]
          .map(([category, total]) => ({
            category,
            total: Math.round(total * 100) / 100,
          }))
          .sort((a, b) => b.total - a.total),
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to load summary.",
    };
  }
}

export async function getDailyTotals(opts: {
  type: "income" | "expense";
  year: number;
}): Promise<TxnResult<DayTotal[]>> {
  try {
    const business = await getCurrentBusiness();
    if (!business) throw new Error("No business found.");
    const year = Number(opts.year);
    if (!Number.isInteger(year) || year < 2000 || year > 2100)
      throw new Error("Invalid year.");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("transactions")
      .select("amount, settled_at")
      .eq("business_id", business.id)
      .eq("type", opts.type)
      .eq("status", "settled")
      .gte("settled_at", `${year}-01-01T00:00:00.000Z`)
      .lt("settled_at", `${year + 1}-01-01T00:00:00.000Z`)
      .order("settled_at", { ascending: true })
      .limit(5000);
    if (error) throw new Error(error.message);

    const byDay = new Map<string, number>();
    for (const r of data ?? []) {
      if (!r.settled_at) continue;
      const day = String(r.settled_at).slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + (Number(r.amount) || 0));
    }
    return {
      ok: true,
      data: [...byDay.entries()].map(([date, total]) => ({
        date,
        total: Math.round(total * 100) / 100,
      })),
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to load daily totals.",
    };
  }
}
export async function getNetCashFlow(
  range: TimeRange = "30d"
): Promise<TxnResult<{ income: number; expenses: number; net: number; currency: string }>> {
  try {
    const business = await getCurrentBusiness();
    if (!business) throw new Error("No business found.");
    const supabase = await createClient();
    let query = supabase
      .from("transactions")
      .select("type, amount")
      .eq("business_id", business.id)
      .eq("status", "settled")
      .limit(2000);
    const since = rangeStart(range);
    if (since) query = query.gte("settled_at", since);
    const { data, error } = await query;
    if (error) throw new Error(error.message);

    let income = 0;
    let expenses = 0;
    for (const r of data ?? []) {
      const amt = Number(r.amount) || 0;
      if (r.type === "income") income += amt;
      else expenses += amt;
    }
    income = Math.round(income * 100) / 100;
    expenses = Math.round(expenses * 100) / 100;
    return {
      ok: true,
      data: {
        income,
        expenses,
        net: Math.round((income - expenses) * 100) / 100,
        currency: business.currency,
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to load cash flow.",
    };
  }
}
