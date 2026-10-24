"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type CreditSignal = {
  name: string;
  value: string;
  points: number;
  maxPoints: number;
  meaning: string;
  how: string;
  /** Visual group heading on the credit page (e.g. S6a + S6b). */
  group?: string;
};

export type CreditSummary = {
  score: number;
  tier: string;
  limit: number;
  eligible: boolean;
  pointsAway: number;
  consent: boolean;
  signals: CreditSignal[];
  computedAt: string;
  /** True when points reached Starter but minimum activity gates failed. */
  capped: boolean;
  salesAway: number;
  amountAway: number;
  /** Raw score minus raw score with last-7-day transactions excluded. */
  scoreDelta: number;
};

const DAY = 24 * 3600 * 1000;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function stddev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + (v - mean) * (v - mean), 0) / values.length;
  return Math.sqrt(variance);
}

function tierFor(score: number): { tier: string; limit: number } {
  if (score >= 90) return { tier: "Excellent", limit: 1000000 };
  if (score >= 70) return { tier: "Strong", limit: 500000 };
  if (score >= 50) return { tier: "Growing", limit: 150000 };
  if (score >= 30) return { tier: "Starter", limit: 50000 };
  return { tier: "Building", limit: 0 };
}

type ScoredTxn = {
  type?: string | null;
  amount?: number | string | null;
  status?: string | null;
  settled_at?: string | null;
  created_at?: string | null;
  reference?: string | null;
};

function txnStamp(r: ScoredTxn): number {
  return new Date(r.settled_at ?? r.created_at ?? Date.now()).getTime();
}

function txnSum(rows: ScoredTxn[]): number {
  return rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
}

/**
 * Pure signal computation shared by the live score and the "a week ago"
 * approximation (same inputs minus last-7-day transactions). Keeps both
 * in lockstep so the delta hint always reflects the current formula.
 */
function buildSignals(args: {
  now: number;
  income: ScoredTxn[];
  expenses: ScoredTxn[];
  relSettled: number;
  relBad: number;
  byCustomer: Map<string, number>;
  monthsActive: number;
}): {
  signals: CreditSignal[];
  score: number;
  income30Count: number;
  income30Sum: number;
} {
  const { now, income, expenses, relSettled, relBad, byCustomer, monthsActive } =
    args;
  const income90 = txnSum(income);
  const expense90 = txnSum(expenses);

  // 1. Monthly income volume (30d), 25 pts — saturates at ₦800k/mo.
  const since30 = now - 30 * DAY;
  const income30 = income.filter((r) => txnStamp(r) >= since30);
  const income30Count = income30.length;
  const income30Sum = Math.round(txnSum(income30) * 100) / 100;
  const volumePoints = round1(Math.min(25, (income30Sum / 800000) * 25));

  // 2. Income growth: settled income this 30d vs previous 30d.
  const since60 = now - 60 * DAY;
  const rev = (from: number, to: number) =>
    income
      .filter((r) => {
        const t = txnStamp(r);
        return t >= from && t < to;
      })
      .reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const revThis = rev(since30, now);
  const revPrev = rev(since60, since30);
  let growthPoints: number;
  let growthLabel: string;
  if (revPrev === 0) {
    if (revThis === 0) {
      growthPoints = 0;
      growthLabel = "No sales yet";
    } else {
      // First sales are not growth — half credit only.
      growthPoints = 7.5;
      growthLabel = "First sales";
    }
  } else {
    const growthPct = ((revThis - revPrev) / revPrev) * 100;
    const clamped = Math.max(-0.5, Math.min(0.5, (revThis - revPrev) / revPrev));
    growthPoints = round1((clamped + 0.5) * 15);
    growthLabel = `${growthPct >= 0 ? "+" : ""}${round1(growthPct)}%`;
  }

  // 3. Repeat customer rate from the attributed-customer map.
  const repeatDenominator = byCustomer.size;
  const repeaters = [...byCustomer.values()].filter((n) => n >= 2).length;
  const repeatRate = repeatDenominator === 0 ? 0 : repeaters / repeatDenominator;
  let repeatPoints = round1(repeatRate * 15);
  // Small sample: no confidence in the rate yet.
  if (repeatDenominator > 0 && repeatDenominator < 3) {
    repeatPoints = Math.min(repeatPoints, 5);
  }
  if (repeatDenominator === 0) repeatPoints = 0;

  // 4. Payment reliability: settled / (settled + failed + refunded).
  // Binary-ish signal capped at 10 — needs >= 5 settled payments for
  // full confidence.
  const relTerminal = relSettled + relBad;
  let reliabilityPoints: number;
  let reliabilityLabel: string;
  if (relTerminal === 0) {
    reliabilityPoints = 0;
    reliabilityLabel = "No payments yet";
  } else if (relBad === 0) {
    reliabilityPoints = relSettled >= 5 ? 10 : round1((relSettled / 5) * 10);
    reliabilityLabel =
      relSettled >= 5 ? "100%" : `100% · ${relSettled}/5 to confirm`;
  } else {
    const rate = relSettled / relTerminal;
    reliabilityPoints = round1(rate * 10);
    reliabilityLabel = `${Math.round(rate * 100)}%`;
  }

  // 5. Activity consistency: settled income spread across the last
  // 12 weeks. Fewer than 3 transactions = not enough data (0).
  const weeks: number[] = [];
  for (let w = 11; w >= 0; w--) {
    const from = now - (w + 1) * 7 * DAY;
    const to = now - w * 7 * DAY;
    weeks.push(
      income.filter((r) => {
        const t = txnStamp(r);
        return t >= from && t < to;
      }).length
    );
  }
  const total12w = weeks.reduce((s, n) => s + n, 0);
  const activeWeeks = weeks.filter((n) => n > 0).length;
  const sd = stddev(weeks);
  let consistencyPoints: number;
  let consistencyLabel: string;
  if (total12w < 3) {
    consistencyPoints = 0;
    consistencyLabel = "Not enough data yet";
  } else {
    const spread = (activeWeeks / 12) * 5;
    const bonus = 5 - Math.min(5, sd * 1);
    consistencyPoints = round1(Math.min(10, spread + bonus));
    consistencyLabel = `${activeWeeks}/12 active weeks`;
  }

  // 6a. Net cash scale (90d): absolute net, saturating at ₦5M so
  // large expenses stay visible even for high-volume businesses.
  // 6b. Profit margin (90d): net over total volume. 60% margin earns
  // full marks — genuinely exceptional for an SME.
  const net90 = Math.round((income90 - expense90) * 100) / 100;
  const cashScalePoints =
    net90 <= 0 ? 0 : round1(Math.min(7, (net90 / 5000000) * 7));
  const volume90 = income90 + expense90;
  const margin90 = volume90 <= 0 ? 0 : net90 / volume90;
  const marginPoints =
    margin90 <= 0 ? 0 : round1(Math.min(8, margin90 * 13.3));
  const marginLabel =
    volume90 <= 0 ? "no volume yet" : `${Math.round(margin90 * 100)}% margin`;
  const cashValue = `${net90 >= 0 ? "+" : "−"}₦${Math.abs(Math.round(net90)).toLocaleString()} · ${marginLabel}`;

  // 7. Time on platform. Under a month of history earns nothing.
  const timePoints =
    monthsActive < 1
      ? 0
      : monthsActive >= 6
        ? 10
        : round1((monthsActive / 6) * 10);

  const signals: CreditSignal[] = [
    {
      name: "Monthly income volume",
      value: `₦${Math.round(income30Sum).toLocaleString()} · ${income30Count} sale${income30Count === 1 ? "" : "s"}`,
      points: volumePoints,
      maxPoints: 25,
      meaning: "Business size",
      how: "Settled income NGN in the last 30 days. ₦800,000 is a full score.",
    },
    {
      name: "Income growth",
      value: growthLabel,
      points: growthPoints,
      maxPoints: 15,
      meaning: "Momentum",
      how: "Settled income this 30 days vs the previous 30. ±50% maps to 0–15 points; first-ever sales earn half.",
    },
    {
      name: "Repeat customers",
      value: repeatDenominator === 0 ? "No customer-linked sales yet" : `${Math.round(repeatRate * 100)}%`,
      points: repeatPoints,
      maxPoints: 15,
      meaning: "Demand quality",
      how: "Customers with 2+ settled checkout sales. Manual cash logs carry no attribution; fewer than 3 customers caps at 5.",
    },
    {
      name: "Payment reliability",
      value: reliabilityLabel,
      points: reliabilityPoints,
      maxPoints: 10,
      meaning: "Reliability",
      how: "Settled income out of all income attempts (settled, failed, refunded). Needs 5+ settled payments for full confidence.",
    },
    {
      name: "Activity consistency",
      value: consistencyLabel,
      points: consistencyPoints,
      maxPoints: 10,
      meaning: "Stability",
      how: "Spread of active weeks over the last 12 plus steadiness. Fewer than 3 transactions scores 0.",
    },
    {
      name: "Net cash scale",
      value: cashValue,
      points: cashScalePoints,
      maxPoints: 7,
      meaning: "Profitability",
      how: "Absolute 90-day net (income minus expenses). ₦5M net is a full score, so large expenses stay visible.",
      group: "Net cash flow & margin",
    },
    {
      name: "Profit margin",
      value: marginLabel,
      points: marginPoints,
      maxPoints: 8,
      meaning: "Profitability",
      how: "90-day net over total volume (income + expenses). 60% margin is a full score.",
      group: "Net cash flow & margin",
    },
    {
      name: "Time on platform",
      value:
        monthsActive < 1
          ? "Less than a month"
          : `${Math.floor(monthsActive)} month${Math.floor(monthsActive) === 1 ? "" : "s"}`,
      points: timePoints,
      maxPoints: 10,
      meaning: "History length",
      how: "No points under 1 month; full marks at 6 months on the platform.",
    },
  ];

  return {
    signals,
    score: round1(signals.reduce((s, g) => s + g.points, 0)),
    income30Count,
    income30Sum,
  };
}

export async function getCreditScore(opts?: {
  businessId?: string;
}): Promise<
  { ok: true; summary: CreditSummary } | { ok: false; error: string }
> {
  try {
    // Admin detail pages pass businessId to score any business with the
    // service-role client (RLS would block a cross-business user query).
    // Callers must verify admin access themselves.
    const scopedId = opts?.businessId;
    let business: { id: string } | null;
    let supabase: Awaited<ReturnType<typeof createClient>>;
    if (scopedId) {
      const admin = createAdminClient();
      const { data } = await admin
        .from("businesses")
        .select("id")
        .eq("id", scopedId)
        .maybeSingle();
      if (!data) throw new Error("Business not found.");
      business = data;
      supabase = admin as unknown as typeof supabase;
    } else {
      business = await getCurrentBusiness();
      if (!business) throw new Error("No business found.");
      supabase = await createClient();
    }

    const now = Date.now();
    const since90 = new Date(now - 90 * DAY).toISOString();

    // Settled money movement only. Orders are promises — this ledger
    // records cash that actually moved (checkout, manual logs, expenses).
    const [{ data: txns, error: txnError }, bizRow] = await Promise.all([
      supabase
        .from("transactions")
        .select("id, type, amount, status, settled_at, created_at, reference")
        .eq("business_id", business.id)
        .gte("settled_at", since90)
        .order("settled_at", { ascending: false })
        .limit(2000),
      supabase
        .from("businesses")
        .select("created_at, credit_consent")
        .eq("id", business.id)
        .maybeSingle()
        .then(
          (res) => res,
          () => ({ data: null, error: null })
        ),
    ]);
    if (txnError) {
      if (/transactions|relation|schema/i.test(txnError.message)) {
        throw new Error(
          "Transactions ledger not set up yet. Please run migration_11 in Supabase first."
        );
      }
      throw new Error(txnError.message);
    }
    // Reliability needs ALL income outcomes (settled + failed + refunded).
    // The main query's settled_at filter would drop NULL-settled_at rows
    // (e.g. failed webhook payments), so fetch status counts separately.
    const { data: reliabilityRows } = await supabase
      .from("transactions")
      .select("type, status, created_at")
      .eq("business_id", business.id)
      .gte("created_at", since90)
      .limit(2000);

    const rows = txns ?? [];
    const settled = rows.filter((r) => r.status === "settled");
    const income = settled.filter((r) => r.type === "income");
    const expenses = settled.filter((r) => r.type === "expense");

    // Consent: pre-migration fallback (column may not exist yet).
    let consent = true;
    let businessCreatedAt: string | null = null;
    if (bizRow && !("error" in bizRow && bizRow.error)) {
      const row = bizRow.data as {
        created_at?: string | null;
        credit_consent?: boolean | null;
      } | null;
      businessCreatedAt = row?.created_at ?? null;
      consent = row?.credit_consent ?? true;
    }
    if (!businessCreatedAt) {
      const { data: createdRow } = await supabase
        .from("businesses")
        .select("created_at")
        .eq("id", business.id)
        .maybeSingle();
      businessCreatedAt =
        (createdRow as { created_at?: string | null } | null)?.created_at ?? null;
    }

    const stamp = (r: { settled_at: string | null; created_at: string }) =>
      new Date(r.settled_at ?? r.created_at).getTime();

    // 3. Repeat attribution: income references checkout orders, which
    // link to customers. Resolved once here; counted per transaction
    // set (live + week-ago) by buildSignals.
    const orderRefs = [
      ...new Set(
        income
          .map((r) => r.reference)
          .filter((v): v is string => typeof v === "string" && v.length > 0)
      ),
    ];
    const orderCustomer = new Map<string, string>();
    if (orderRefs.length > 0) {
      const { data: refOrders } = await supabase
        .from("orders")
        .select("id, customer_id")
        .eq("business_id", business.id)
        .in("id", orderRefs.slice(0, 500));
      for (const o of refOrders ?? []) {
        const row = o as { id?: string; customer_id?: string | null };
        if (typeof row.id === "string" && typeof row.customer_id === "string") {
          orderCustomer.set(row.id, row.customer_id);
        }
      }
    }
    function customersFor(
      refs: (string | null | undefined)[]
    ): Map<string, number> {
      const byCustomer = new Map<string, number>();
      for (const ref of refs) {
        if (typeof ref !== "string" || !ref) continue;
        const cid = orderCustomer.get(ref);
        if (!cid) continue;
        byCustomer.set(cid, (byCustomer.get(cid) ?? 0) + 1);
      }
      return byCustomer;
    }
    const byCustomer = customersFor(income.map((r) => r.reference));

    // 4. Payment reliability counts from the UNFILTERED set (settled +
    // failed + refunded). Scored inside buildSignals.
    const relRows = ((reliabilityRows ?? []) as {
      type?: string;
      status?: string;
    }[]);
    const relSettled = relRows.filter(
      (r) => r.type === "income" && r.status === "settled"
    ).length;
    const relBad = relRows.filter(
      (r) =>
        r.type === "income" && (r.status === "failed" || r.status === "refunded")
    ).length;

    // 7. Time on platform (months). Scored inside buildSignals.
    const monthsActive = businessCreatedAt
      ? Math.max(0, (now - new Date(businessCreatedAt).getTime()) / (30.44 * DAY))
      : 0;

    // Live score from the full 90-day window.
    const {
      signals,
      score,
      income30Count,
      income30Sum,
    } = buildSignals({
      now,
      income,
      expenses,
      relSettled,
      relBad,
      byCustomer,
      monthsActive,
    });

    // Week-ago approximation: same formula, last-7-day transactions
    // excluded. Positive delta proves the score reacts to new activity.
    const weekAgoCutoff = now - 7 * DAY;
    const incomePrev = income.filter((r) => stamp(r) < weekAgoCutoff);
    const expensesPrev = expenses.filter((r) => stamp(r) < weekAgoCutoff);
    const relPrev = (
      (reliabilityRows ?? []) as {
        type?: string;
        status?: string;
        created_at?: string | null;
      }[]
    ).filter((r) => {
      if (!r.created_at) return true;
      return new Date(r.created_at).getTime() < weekAgoCutoff;
    });
    const relSettledPrev = relPrev.filter(
      (r) => r.type === "income" && r.status === "settled"
    ).length;
    const relBadPrev = relPrev.filter(
      (r) =>
        r.type === "income" && (r.status === "failed" || r.status === "refunded")
    ).length;
    const byCustomerPrev = customersFor(incomePrev.map((r) => r.reference));
    const { score: prevScore } = buildSignals({
      now,
      income: incomePrev,
      expenses: expensesPrev,
      relSettled: relSettledPrev,
      relBad: relBadPrev,
      byCustomer: byCustomerPrev,
      monthsActive,
    });
    const scoreDelta = round1(score - prevScore);

    // Minimum gates for any tier: 3+ settled sales AND ₦100k settled
    // income in the last 30 days. Points without activity stay Building.
    const MIN_TXNS_30D = 3;
    const MIN_SUM_30D = 100000;
    const salesAway = Math.max(0, MIN_TXNS_30D - income30Count);
    const amountAway =
      Math.round(Math.max(0, MIN_SUM_30D - income30Sum) * 100) / 100;
    const meetsMinimums = salesAway === 0 && amountAway === 0;

    let { tier, limit } = tierFor(score);
    let eligible = score >= 30;
    let capped = false;
    if (eligible && !meetsMinimums) {
      capped = true;
      eligible = false;
      tier = "Building";
      limit = 0;
    }

    return {
      ok: true,
      summary: {
        score,
        tier,
        limit,
        eligible,
        pointsAway: eligible ? 0 : round1(30 - score),
        consent,
        signals,
        computedAt: new Date().toISOString(),
        capped,
        salesAway,
        amountAway,
        scoreDelta,
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to compute score.",
    };
  }
}

export async function updateCreditConsent(
  consent: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const business = await getCurrentBusiness();
    if (!business) throw new Error("No business found.");
    const supabase = await createClient();
    const { error } = await supabase
      .from("businesses")
      .update({ credit_consent: consent })
      .eq("id", business.id);
    if (error) {
      if (/credit_consent/i.test(error.message)) {
        return {
          ok: false,
          error: "Please run migration_10 in Supabase first.",
        };
      }
      throw new Error(error.message);
    }
    revalidatePath("/dashboard/credit-score");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save consent.",
    };
  }
}
